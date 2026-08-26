import { z } from 'zod';
import type { McpUndoService } from '../undo/mcp-undo.service';
import { textResult, type ToolDefinition } from './types';

const inputSchema = {
  auditId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Id de la entrada de actividad a deshacer. Si se omite, deshace la última creación de este token dentro de las últimas 24h.',
    ),
};

export function fluxoUndoTool(deps: {
  undoService: McpUndoService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_undo',
    requiredScope: 'finances:write',
    config: {
      title: 'Deshacer la última acción',
      description:
        'Deshace una creación reciente (una transacción registrada, un aporte, o un recurso de configuración creado con fluxo_create). Solo funciona sobre creaciones, dentro de las 24h, y una sola vez por acción. No puede deshacer ediciones ni borrados.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const { tool, entityType, entityId } = await deps.undoService.undo(
        ctx.userId,
        args.auditId as string | undefined,
      );
      return textResult(
        `Deshecho: "${tool}" sobre ${entityType} (${entityId}).`,
      );
    },
  };
}
