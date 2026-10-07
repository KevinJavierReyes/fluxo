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
    expect(calls[0][0].where.toAccountId).toEqual({ in: ['acc-1'] });
    expect(calls[1][0].where.fromAccountId).toEqual({ in: ['acc-1'] });
  });

  it('el saldo real solo suma transacciones CONFIRMED', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 0 }]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transfer.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const service = new CashflowService(prisma as unknown as PrismaService);
    await service.getBalanceAt(userId, at);

    const calls = prisma.transaction.groupBy.mock.calls as {
      where: { status: unknown };
    }[][];
    expect(calls[0][0].where.status).toBe('CONFIRMED');
  });

  it('el saldo proyectado suma las PENDING solo si la fecha consultada es posterior a hoy', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 0 }]);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transfer.aggregate.mockResolvedValue({ _sum: { amount: null } });
    const today = new Date('2026-09-10T00:00:00.000Z');

    const service = new CashflowService(prisma as unknown as PrismaService);
    await service.getBalanceAt(
      userId,
      new Date('2026-09-20T00:00:00.000Z'),
      undefined,
      true,
      today,
    );
    await service.getBalanceAt(
      userId,
      new Date('2026-09-08T00:00:00.000Z'),
      undefined,
      true,
      today,
    );

    const calls = prisma.transaction.groupBy.mock.calls as {
      where: { status: unknown };
    }[][];
    expect(calls[0][0].where.status).toEqual({
      in: ['CONFIRMED', 'PENDING'],
    });
    expect(calls[1][0].where.status).toBe('CONFIRMED');
  });
});

describe('CashflowService.getProjection (real vs proyectado)', () => {
  const userId = 'user-1';
  const d = (day: string) => new Date(`2026-09-${day}T00:00:00.000Z`);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T12:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function makeService(
    dailyRows: {
      date: Date;
      type: string;
      status: string;
      amount: number;
    }[],
  ) {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ openingBalance: 1000 }]);
    prisma.transaction.groupBy.mockImplementation((args: { by: string[] }) =>
      args.by.includes('date')
        ? Promise.resolve(
            dailyRows.map((r) => ({
              date: r.date,
              type: r.type,
              status: r.status,
              _sum: { amount: r.amount },
            })),
          )
        : Promise.resolve([]),
    );
    prisma.transfer.groupBy.mockResolvedValue([]);
    prisma.transfer.aggregate.mockResolvedValue({ _sum: { amount: null } });
    return {
      prisma,
      service: new CashflowService(prisma as unknown as PrismaService),
    };
  }

  it('separa saldo real y proyectado; una PENDING vencida cuenta hoy y una futura en su fecha', async () => {
    const { service } = makeService([
      { date: d('09'), type: 'EXPENSE', status: 'CONFIRMED', amount: 100 },
      { date: d('05'), type: 'EXPENSE', status: 'PENDING', amount: 50 },
      { date: d('12'), type: 'EXPENSE', status: 'PENDING', amount: 30 },
    ]);

    const result = await service.getProjection(
      userId,
      { from: d('08'), to: d('15') },
      'UTC',
    );

    expect(result.startingBalance).toBe(1000);
    expect(result.realStartingBalance).toBe(1000);
    expect(result.points.map((p) => p.date.toISOString().slice(0, 10))).toEqual(
      ['2026-09-09', '2026-09-10', '2026-09-12'],
    );

    const [past, today, future] = result.points;
    expect(past).toMatchObject({
      openingBalance: 1000,
      closingBalance: 900,
      realOpeningBalance: 1000,
      realClosingBalance: 900,
      hasPending: false,
    });
    // La PENDING vencida del 05 cae en hoy: baja el proyectado, no el real.
    expect(today).toMatchObject({
      openingBalance: 900,
      closingBalance: 850,
      realOpeningBalance: 900,
      realClosingBalance: 900,
      hasPending: true,
    });
    expect(future).toMatchObject({
      openingBalance: 850,
      closingBalance: 820,
      realOpeningBalance: null,
      realClosingBalance: null,
      hasPending: true,
    });
  });

  it('ignora las SKIPPED y no acota por abajo las PENDING en la consulta (pueden estar vencidas)', async () => {
    const { prisma, service } = makeService([
      { date: d('11'), type: 'EXPENSE', status: 'SKIPPED', amount: 999 },
    ]);

    const result = await service.getProjection(
      userId,
      { from: d('10'), to: d('15') },
      'UTC',
    );

    expect(result.points).toHaveLength(0);

    const dailyCall = (
      prisma.transaction.groupBy.mock.calls as {
        by: string[];
        where: { OR: { status: string; date: Record<string, Date> }[] };
      }[][]
    )
      .map((c) => c[0])
      .find((c) => c.by.includes('date'))!;
    const statuses = dailyCall.where.OR.map((o) => o.status);
    expect(statuses).toEqual(['CONFIRMED', 'PENDING']);
    expect(dailyCall.where.OR[1].date.gte).toBeUndefined();
  });

  it('una PENDING vencida con fecha previa al rango entra como hoy si hoy está en el rango', async () => {
    const { service } = makeService([
      { date: d('01'), type: 'INCOME', status: 'PENDING', amount: 200 },
    ]);

    const result = await service.getProjection(
      userId,
      { from: d('10'), to: d('12') },
      'UTC',
    );

    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toMatchObject({
      closingBalance: 1200,
      realClosingBalance: 1000,
    });
  });
});
