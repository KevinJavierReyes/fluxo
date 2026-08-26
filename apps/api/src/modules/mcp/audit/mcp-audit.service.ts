import { Injectable, Logger } from '@nestjs/common';
import { McpCallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuditEntry {
  userId: string;
  tokenId?: string | null;
  tool: string;
  args?: Record<string, unknown>;
  status: McpCallStatus;
  errorCode?: string;
  entityType?: string;
  entityId?: string;
  clientRequestId?: string;
  durationMs?: number;
}

/**
 * Registra toda llamada a una tool (lecturas y escrituras). `clientName` se
 * resuelve a la hora de LEER la actividad (join contra OAuthClient), no
 * acá, para no pagar una query extra en cada llamada de tool.
 */
@Injectable()
export class McpAuditService {
  private readonly logger = new Logger(McpAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.mcpAuditLog.create({
        data: {
          userId: entry.userId,
          tokenId: entry.tokenId ?? null,
          tool: entry.tool,
          argsRedacted: (entry.args ?? {}) as Prisma.InputJsonValue,
          status: entry.status,
          errorCode: entry.errorCode,
          entityType: entry.entityType,
          entityId: entry.entityId,
          clientRequestId: entry.clientRequestId,
          durationMs: entry.durationMs,
        },
      });
    } catch (error) {
      // Nunca se rompe la respuesta de una tool porque falló su propio log.
      this.logger.warn(
        `No se pudo registrar auditoría de "${entry.tool}": ${(error as Error).message}`,
      );
    }
  }
}

export { McpCallStatus };
