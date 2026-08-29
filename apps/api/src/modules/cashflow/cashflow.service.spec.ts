import { CashflowService } from './cashflow.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface MockPrisma {
  account: { findMany: jest.Mock };
  transaction: { groupBy: jest.Mock };
  transfer: { groupBy: jest.Mock; aggregate: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return {
    account: { findMany: jest.fn() },
    transaction: { groupBy: jest.fn() },
    transfer: { groupBy: jest.fn(), aggregate: jest.fn() },
  };
}

describe('CashflowService.getBalanceAt', () => {
  const userId = 'user-1';
  const at = new Date('2026-08-29T00:00:00.000Z');

  it('suma ingresos, resta gastos, y neta transferencias entrantes/salientes — sin contarlas como ingreso/gasto', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 1000 }]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: 200 } },
      { type: 'EXPENSE', _sum: { amount: 50 } },
    ]);
    // Orden de llamada = orden de la Promise.all en el service: entrantes, luego salientes.
    prisma.transfer.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 300 } })
      .mockResolvedValueOnce({ _sum: { amount: 100 } });

    const service = new CashflowService(prisma as unknown as PrismaService);
    const balance = await service.getBalanceAt(userId, at);

    // 1000 (apertura) + 200 (ingreso) - 50 (gasto) + 300 (transfer in) - 100 (transfer out)
    expect(balance).toBe(1350);
  });

  it('sin ninguna transferencia, el resultado es igual al cálculo previo (solo apertura + ingreso - gasto)', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 500 }]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: 100 } },
      { type: 'EXPENSE', _sum: { amount: 30 } },
    ]);
    prisma.transfer.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    const service = new CashflowService(prisma as unknown as PrismaService);
    const balance = await service.getBalanceAt(userId, at);

    expect(balance).toBe(570);
  });

  it('filtra por accountId cuando se especifica (usa toAccountId/fromAccountId exactos, no isArchived)', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 0 }]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transfer.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 50 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } });

    const service = new CashflowService(prisma as unknown as PrismaService);
    await service.getBalanceAt(userId, at, 'acc-1');

    const calls = prisma.transfer.aggregate.mock.calls as {
      where: Record<string, unknown>;
    }[][];
    expect(calls[0][0].where.toAccountId).toBe('acc-1');
    expect(calls[1][0].where.fromAccountId).toBe('acc-1');
  });
});
