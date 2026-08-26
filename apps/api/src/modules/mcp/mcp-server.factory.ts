import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpCallStatus } from '@prisma/client';
import { decimalsToNumbers } from '../../common/decimal.util';
import type { McpScope } from '../oauth/oauth.constants';
import { McpAuditService } from './audit/mcp-audit.service';
import { McpToolError, toToolErrorResult } from './errors/mcp-error';
import { PromptRegistryService } from './prompts/prompt-registry.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import type { ToolUserContext } from './tools/types';

const FLUXO_INSTRUCTIONS = `Fluxo es la app de finanzas personales del usuario. Convenciones:
- Los montos son números en la moneda del usuario, sin símbolo.
- Las fechas de negocio son YYYY-MM-DD (sin hora); "hoy" se interpreta en la zona horaria del usuario, no en UTC.
- TransactionType solo admite INCOME o EXPENSE.
- Las cuentas y categorías se referencian por nombre o id en las tools de lectura. Si un nombre no matchea exactamente o hay más de una coincidencia, la tool devuelve las opciones válidas — no adivines un id, repregunta al usuario con esas opciones.
- fluxo_search encuentra el id de un recurso de configuración por nombre; fluxo_describe da el schema completo de un recurso y los valores que ya existen.
- Las tools de escritura aceptan clientRequestId opcional: generá uno por operación y reenvialo si reintentás, para no duplicar el movimiento.
- No hay ninguna tool que borre más de un elemento a la vez, y borrar exige confirm:true explícito.`;

@Injectable()
export class McpServerFactory {
  private readonly logger = new Logger('McpTool');

  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly auditService: McpAuditService,
  ) {}

  create(
    ctx: ToolUserContext,
    grantedScopes: McpScope[],
    tokenId: string | null,
  ): McpServer {
    const server = new McpServer(
      { name: 'fluxo', version: '0.1.0' },
      {
        capabilities: { tools: {}, prompts: {} },
        instructions: FLUXO_INSTRUCTIONS,
      },
    );

    for (const tool of this.toolRegistry.getTools()) {
      if (!grantedScopes.includes(tool.requiredScope)) {
        // El token no alcanza para esta tool: ni siquiera se anuncia en
        // tools/list, así el modelo no puede intentarla y toparse con un 403.
        continue;
      }
      server.registerTool(
        tool.name,
        tool.config,
        async (args: Record<string, unknown>) => {
          const startedAt = Date.now();
          try {
            const result = await tool.handler(args, ctx);
            const { entityType, entityId, ...wireResult } = result;

            void this.auditService.record({
              userId: ctx.userId,
              tokenId,
              tool: tool.name,
              args,
              status: McpCallStatus.OK,
              entityType,
              entityId,
              clientRequestId: args.clientRequestId as string | undefined,
              durationMs: Date.now() - startedAt,
            });

            // Los handlers suelen devolver entidades de Prisma tal cual;
            // a diferencia de las respuestas REST, esto no pasa por
            // DecimalToNumberInterceptor porque el SDK de MCP escribe la
            // respuesta directo al socket, sin el pipeline de Nest.
            return decimalsToNumbers(wireResult) as typeof wireResult;
          } catch (error) {
            void this.auditService.record({
              userId: ctx.userId,
              tokenId,
              tool: tool.name,
              args,
              status: McpCallStatus.ERROR,
              errorCode: error instanceof McpToolError ? error.code : undefined,
              clientRequestId: args.clientRequestId as string | undefined,
              durationMs: Date.now() - startedAt,
            });
            return toToolErrorResult(error, this.logger);
          }
        },
      );
    }

    for (const prompt of this.promptRegistry.getPrompts()) {
      if (!grantedScopes.includes(prompt.requiredScope)) {
        continue;
      }
      server.registerPrompt(prompt.name, prompt.config, (args) =>
        prompt.handler(args, ctx),
      );
    }

    return server;
  }
}
