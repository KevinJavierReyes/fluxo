import { McpUndoService } from './mcp-undo.service';
import { McpToolError } from '../errors/mcp-error';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { TransactionsService } from '../../transactions/transactions.service';
import type { TransfersService } from '../../transfers/transfers.service';
import type {
  ResourceDescriptor,
  ResourceKey,
} from '../tools/generic/resource-registry';

interface MockPrisma {
  mcpAuditLog: { findFirst: jest.Mock; update: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return { mcpAuditLog: { findFirst: jest.fn(), update: jest.fn() } };
}

function makeTransactionsServiceMock() {
  return { findOne: jest.fn(), remove: jest.fn() };
}

function makeTransfersServiceMock() {
  return { findOne: jest.fn(), remove: jest.fn() };
}

function makeAssetDescriptorMock() {
  return {
    key: 'asset' as ResourceKey,
    get: jest.fn(),
    archive: jest.fn(),
  } as unknown as ResourceDescriptor & {
    get: jest.Mock;
    archive: jest.Mock;
  };
}

function untouched(createdAt: Date) {
  return { createdAt, updatedAt: createdAt };
}

function touched(createdAt: Date, updatedAt: Date) {
  return { createdAt, updatedAt };
}

function makeService(
  prisma: MockPrisma,
  transactionsService: ReturnType<typeof makeTransactionsServiceMock>,
  transfersService: ReturnType<typeof makeTransfersServiceMock>,
  registry: Record<ResourceKey, ResourceDescriptor>,
): McpUndoService {
  return new McpUndoService(
    prisma as unknown as PrismaService,
    transactionsService as unknown as TransactionsService,
    transfersService as unknown as TransfersService,
    registry,
  );
}

describe('McpUndoService.undo', () => {
  const userId = 'user-1';
  // Relativo al reloj real (no una fecha hardcodeada): la ventana de undo es
  // de 24h contra Date.now(), así que un valor fijo eventualmente queda
  // "viejo" y los tests empiezan a fallar por el solo paso del tiempo.
  const now = new Date(Date.now() - 60 * 1000);

  it('deshace una transacción recién creada y sin tocar', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const registry = {} as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-1',
      tool: 'record_transaction',
      status: 'OK',
      undoneAt: null,
      entityType: 'transaction',
      entityId: 'tx-1',
      createdAt: now,
    });
    transactionsService.findOne.mockResolvedValue(untouched(now));

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );
    const result = await service.undo(userId);

    expect(transactionsService.remove).toHaveBeenCalledWith(userId, 'tx-1');
    expect(prisma.mcpAuditLog.update).toHaveBeenCalledWith({
      where: { id: 'audit-1' },
      data: { undoneAt: expect.any(Date) as Date },
    });
    expect(result).toEqual({
      auditId: 'audit-1',
      tool: 'record_transaction',
      entityType: 'transaction',
      entityId: 'tx-1',
    });
  });

  it('deshace una transferencia recién creada y sin tocar', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const registry = {} as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-3',
      tool: 'transfer_between_accounts',
      status: 'OK',
      undoneAt: null,
      entityType: 'transfer',
      entityId: 'transfer-1',
      createdAt: now,
    });
    transfersService.findOne.mockResolvedValue(untouched(now));

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );
    const result = await service.undo(userId);

    expect(transfersService.remove).toHaveBeenCalledWith(userId, 'transfer-1');
    expect(result).toEqual({
      auditId: 'audit-3',
      tool: 'transfer_between_accounts',
      entityType: 'transfer',
      entityId: 'transfer-1',
    });
  });

  it('rechaza deshacer una transacción que fue editada después de crearse', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const registry = {} as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-1',
      tool: 'record_transaction',
      status: 'OK',
      undoneAt: null,
      entityType: 'transaction',
      entityId: 'tx-1',
      createdAt: now,
    });
    transactionsService.findOne.mockResolvedValue(
      touched(now, new Date(now.getTime() + 60_000)),
    );

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );

    await expect(service.undo(userId)).rejects.toThrow(McpToolError);
    expect(transactionsService.remove).not.toHaveBeenCalled();
    expect(prisma.mcpAuditLog.update).not.toHaveBeenCalled();
  });

  it('deshace (archiva) un recurso de fluxo_create recién creado y sin tocar', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const assetDescriptor = makeAssetDescriptorMock();
    const registry = {
      asset: assetDescriptor,
    } as unknown as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-2',
      tool: 'fluxo_create',
      status: 'OK',
      undoneAt: null,
      entityType: 'asset',
      entityId: 'asset-1',
      createdAt: now,
    });
    assetDescriptor.get.mockResolvedValue(untouched(now));

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );
    await service.undo(userId);

    expect(assetDescriptor.archive).toHaveBeenCalledWith(userId, 'asset-1');
  });

  it('rechaza deshacer un recurso que ya fue archivado/editado manualmente después de crearse', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const assetDescriptor = makeAssetDescriptorMock();
    const registry = {
      asset: assetDescriptor,
    } as unknown as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-2',
      tool: 'fluxo_create',
      status: 'OK',
      undoneAt: null,
      entityType: 'asset',
      entityId: 'asset-1',
      createdAt: now,
    });
    assetDescriptor.get.mockResolvedValue(
      touched(now, new Date(now.getTime() + 10_000)),
    );

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );

    await expect(service.undo(userId)).rejects.toThrow(McpToolError);
    expect(assetDescriptor.archive).not.toHaveBeenCalled();
    expect(prisma.mcpAuditLog.update).not.toHaveBeenCalled();
  });

  it('lanza NOT_FOUND cuando no hay nada deshacible en las últimas 24h', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const registry = {} as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue(null);

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );

    await expect(service.undo(userId)).rejects.toThrow(McpToolError);
  });

  it('rechaza deshacer algo que ya se había deshecho antes (buscado por auditId)', async () => {
    const prisma = makePrismaMock();
    const transactionsService = makeTransactionsServiceMock();
    const transfersService = makeTransfersServiceMock();
    const registry = {} as Record<ResourceKey, ResourceDescriptor>;

    prisma.mcpAuditLog.findFirst.mockResolvedValue({
      id: 'audit-1',
      tool: 'record_transaction',
      status: 'OK',
      undoneAt: new Date(),
      entityType: 'transaction',
      entityId: 'tx-1',
      createdAt: now,
    });

    const service = makeService(
      prisma,
      transactionsService,
      transfersService,
      registry,
    );

    await expect(service.undo(userId, 'audit-1')).rejects.toThrow(McpToolError);
    expect(transactionsService.remove).not.toHaveBeenCalled();
  });
});
