import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransfersService } from '../../transfers/transfers.service';
import { McpToolError } from '../errors/mcp-error';
import type {
  ResourceDescriptor,
  ResourceKey,
} from '../tools/generic/resource-registry';
import { RESOURCE_REGISTRY } from '../tools/generic/resource-registry.provider';

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Únicas tools que solo crean (nunca editan/borran de refilón) — lo demás no es seguro de revertir con un simple "borrar la entidad". */
export const UNDOABLE_TOOLS = [
  'record_transaction',
  'apply_expense_template',
  'contribute_to_savings_goal',
  'fluxo_create',
  'create_recurring_expense',
  'transfer_between_accounts',
];

// Prisma escribe `createdAt` (DB) y `updatedAt` (cliente) con relojes
// distintos, así que no van a coincidir al bit — 2s de tolerancia separa
// "recién creado, sin tocar" de "alguien lo editó/archivó después", que es
// justo lo que no queremos deshacer por abajo sin avisar.
const UNTOUCHED_TOLERANCE_MS = 2000;

function assertUntouchedSinceCreation(entity: Record<string, unknown>): void {
  const { createdAt, updatedAt } = entity;
  if (!(createdAt instanceof Date) || !(updatedAt instanceof Date)) {
    return;
  }
  if (
    Math.abs(updatedAt.getTime() - createdAt.getTime()) > UNTOUCHED_TOLERANCE_MS
  ) {
    throw new McpToolError(
      'VALIDATION',
      'Eso se modificó después de crearse (edición, archivado, etc.) — no se puede deshacer automáticamente para no perder ese cambio. Editalo o borralo manualmente si hace falta.',
    );
  }
}

export interface UndoResult {
  auditId: string;
  tool: string;
  entityType: string;
  entityId: string;
}

/**
 * Lógica de "deshacer" compartida entre la tool MCP `fluxo_undo` y el botón
 * Deshacer del log de actividad en la web — es la misma operación mirada
 * desde dos superficies distintas, así que vive en un solo lugar.
 */
@Injectable()
export class McpUndoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
    private readonly transfersService: TransfersService,
    @Inject(RESOURCE_REGISTRY)
    private readonly registry: Record<ResourceKey, ResourceDescriptor>,
  ) {}

  async undo(userId: string, auditId?: string): Promise<UndoResult> {
    const entry = auditId
      ? await this.prisma.mcpAuditLog.findFirst({
          where: { id: auditId, userId },
        })
      : await this.prisma.mcpAuditLog.findFirst({
          where: {
            userId,
            status: 'OK',
            undoneAt: null,
            entityType: { not: null },
            tool: { in: UNDOABLE_TOOLS },
            createdAt: { gte: new Date(Date.now() - UNDO_WINDOW_MS) },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!entry) {
      throw new McpToolError(
        'NOT_FOUND',
        auditId
          ? 'No encontré esa entrada de actividad.'
          : 'No hay ninguna creación reciente (últimas 24h) para deshacer.',
      );
    }
    if (entry.undoneAt) {
      throw new McpToolError(
        'VALIDATION',
        'Esa acción ya se había deshecho antes.',
      );
    }
    if (!UNDOABLE_TOOLS.includes(entry.tool)) {
      throw new McpToolError(
        'VALIDATION',
        `"${entry.tool}" no se puede deshacer — solo se pueden revertir creaciones (transacciones, aportes, o recursos de configuración).`,
      );
    }
    if (entry.createdAt.getTime() < Date.now() - UNDO_WINDOW_MS) {
      throw new McpToolError(
        'VALIDATION',
        'Esa acción tiene más de 24h — ya no se puede deshacer desde acá.',
      );
    }
    if (!entry.entityType || !entry.entityId) {
      throw new McpToolError(
        'VALIDATION',
        'Esa llamada no dejó registrado qué creó.',
      );
    }

    if (entry.entityType === 'transaction') {
      const transaction = await this.transactionsService.findOne(
        userId,
        entry.entityId,
      );
      assertUntouchedSinceCreation(transaction);
      await this.transactionsService.remove(userId, entry.entityId);
    } else if (entry.entityType === 'transfer') {
      const transfer = await this.transfersService.findOne(
        userId,
        entry.entityId,
      );
      assertUntouchedSinceCreation(transfer);
      await this.transfersService.remove(userId, entry.entityId);
    } else {
      const descriptor = this.registry[entry.entityType as ResourceKey];
      if (!descriptor) {
        throw new McpToolError(
          'VALIDATION',
          `No sé cómo deshacer un "${entry.entityType}".`,
        );
      }
      const item = await descriptor.get(userId, entry.entityId);
      assertUntouchedSinceCreation(item);
      // Recién creado: en la inmensa mayoría de los casos no tiene
      // referencias todavía, así que archive() debería borrarlo físico.
      // Si ya las tiene, quedará archivado en vez de desaparecer — mejor
      // eso que fallar.
      await descriptor.archive(userId, entry.entityId);
    }

    await this.prisma.mcpAuditLog.update({
      where: { id: entry.id },
      data: { undoneAt: new Date() },
    });

    return {
      auditId: entry.id,
      tool: entry.tool,
      entityType: entry.entityType,
      entityId: entry.entityId,
    };
  }
}
