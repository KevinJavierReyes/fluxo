import { TransactionType } from '@prisma/client';
import { CashflowService } from './cashflow.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface MockPrisma {
  account: { findMany: jest.Mock };
  transaction: { groupBy: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return {
    account: { findMany: jest.fn() },
    transaction: { groupBy: jest.fn() },
  };
}

function makeService(prisma: MockPrisma): CashflowService {
  return new CashflowService(prisma as unknown as PrismaService);
}

/**
 * Extrae el `where` del último llamado a `groupBy`. Encapsula el `as`
 * necesario para leer `mock.calls` en un solo lugar en vez de anidar
 * `expect.objectContaining` (que en TS estricto propaga `any`).
 */
function lastGroupByWhere(groupBy: jest.Mock): Record<string, unknown> {
  const calls = groupBy.mock.calls as { where: Record<string, unknown> }[][];
  return calls[calls.length - 1][0].where;
}

describe('CashflowService.getBalanceAt', () => {
  const userId = 'user-1';
  const at = new Date('2026-06-15T00:00:00Z');

  it('suma los saldos iniciales de las cuentas más ingresos menos egresos', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([
      { openingBalance: 1000 },
      { openingBalance: 500 },
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: TransactionType.INCOME, _sum: { amount: 300 } },
      { type: TransactionType.EXPENSE, _sum: { amount: 120 } },
    ]);
    const service = makeService(prisma);

    const balance = await service.getBalanceAt(userId, at);

    // 1000 + 500 + 300 - 120 = 1680
    expect(balance).toBe(1680);
  });

  it('excluye cuentas archivadas cuando no se filtra por cuenta específica', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const service = makeService(prisma);

    await service.getBalanceAt(userId, at);

    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { userId, isArchived: false },
    });
    expect(lastGroupByWhere(prisma.transaction.groupBy)).toMatchObject({
      account: { isArchived: false },
    });
  });

  it('con accountId no aplica el filtro de archivadas (permite ver una cuenta archivada puntual)', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const service = makeService(prisma);

    await service.getBalanceAt(userId, at, 'acc-1');

    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { userId, id: 'acc-1' },
    });
    expect(lastGroupByWhere(prisma.transaction.groupBy)).toMatchObject({
      accountId: 'acc-1',
    });
  });

  it('exclusive=true usa "lt" en vez de "lte" (para el saldo de apertura de un rango)', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const service = makeService(prisma);

    await service.getBalanceAt(userId, at, undefined, true);

    expect(lastGroupByWhere(prisma.transaction.groupBy)).toMatchObject({
      date: { lt: at },
    });
  });

  it('exclusive=false (default) usa "lte"', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const service = makeService(prisma);

    await service.getBalanceAt(userId, at);

    expect(lastGroupByWhere(prisma.transaction.groupBy)).toMatchObject({
      date: { lte: at },
    });
  });

  it('devuelve 0 cuando no hay cuentas ni movimientos', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    const service = makeService(prisma);

    expect(await service.getBalanceAt(userId, at)).toBe(0);
  });

  it('maneja el caso de solo ingresos o solo egresos sin el otro en el groupBy', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 100 }]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: TransactionType.EXPENSE, _sum: { amount: 40 } },
    ]);
    const service = makeService(prisma);

    expect(await service.getBalanceAt(userId, at)).toBe(60);
  });
});

describe('CashflowService.getProjection', () => {
  const userId = 'user-1';

  it('acumula el saldo día a día a partir del saldo inicial', async () => {
    const prisma = makePrismaMock();
    // getBalanceAt (saldo inicial, exclusive) -> sin cuentas/movimientos previos
    prisma.account.findMany.mockResolvedValueOnce([{ openingBalance: 1000 }]);
    prisma.transaction.groupBy
      .mockResolvedValueOnce([]) // saldo inicial: sin movimientos previos a "from"
      .mockResolvedValueOnce([
        {
          date: new Date('2026-01-02T00:00:00Z'),
          type: TransactionType.EXPENSE,
          _sum: { amount: 200 },
        },
        {
          date: new Date('2026-01-03T00:00:00Z'),
          type: TransactionType.INCOME,
          _sum: { amount: 500 },
        },
      ]);
    const service = makeService(prisma);

    const result = await service.getProjection(userId, {
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-01-05T00:00:00Z'),
    });

    expect(result.startingBalance).toBe(1000);
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toMatchObject({
      openingBalance: 1000,
      closingBalance: 800,
      isNegative: false,
    });
    expect(result.points[1]).toMatchObject({
      openingBalance: 800,
      closingBalance: 1300,
    });
    expect(result.negativeDays).toHaveLength(0);
  });

  it('marca como negativos los días en que el saldo acumulado cae bajo cero', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValueOnce([{ openingBalance: 100 }]);
    prisma.transaction.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        date: new Date('2026-01-02T00:00:00Z'),
        type: TransactionType.EXPENSE,
        _sum: { amount: 500 },
      },
    ]);
    const service = makeService(prisma);

    const result = await service.getProjection(userId, {
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-01-05T00:00:00Z'),
    });

    expect(result.points[0].closingBalance).toBe(-400);
    expect(result.points[0].isNegative).toBe(true);
    expect(result.negativeDays).toHaveLength(1);
  });
});
