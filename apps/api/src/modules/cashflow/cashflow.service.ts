import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import {
  bucketStart,
  eachBucket,
  todayUtc,
  type Granularity,
} from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';

export interface CashflowDayPoint {
  date: Date;
  income: number;
  expense: number;
  openingBalance: number;
  closingBalance: number;
  isNegative: boolean;
}

export interface CashflowProjection {
  startingBalance: number;
  points: CashflowDayPoint[];
  negativeDays: Date[];
}

export interface CashflowBalanceBucket {
  bucket: Date;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expense: number;
  isNegative: boolean;
  isFuture: boolean;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

@Injectable()
export class CashflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjection(
    userId: string,
    { from, to, accountId }: { from: Date; to: Date; accountId?: string },
  ): Promise<CashflowProjection> {
    const startingBalance = await this.getBalanceAt(
      userId,
      from,
      accountId,
      true,
    );

    const dailyTx = await this.prisma.transaction.groupBy({
      by: ['date', 'type'],
      where: {
        userId,
        ...(accountId ? { accountId } : {}),
        date: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });

    const byDate = new Map<string, { income: number; expense: number }>();
    for (const row of dailyTx) {
      const key = toDateKey(row.date);
      const entry = byDate.get(key) ?? { income: 0, expense: 0 };
      const amount = Number(row._sum.amount ?? 0);
      if (row.type === TransactionType.INCOME) {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
      byDate.set(key, entry);
    }

    const sortedKeys = Array.from(byDate.keys()).sort();
    let running = startingBalance;
    const points: CashflowDayPoint[] = [];
    const negativeDays: Date[] = [];

    for (const key of sortedKeys) {
      const { income, expense } = byDate.get(key)!;
      const openingBalance = running;
      const closingBalance = openingBalance + income - expense;
      running = closingBalance;
      const isNegative = closingBalance < 0;
      if (isNegative) {
        negativeDays.push(fromDateKey(key));
      }
      points.push({
        date: fromDateKey(key),
        income,
        expense,
        openingBalance,
        closingBalance,
        isNegative,
      });
    }

    return { startingBalance, points, negativeDays };
  }

  /**
   * Serie de saldo agrupada por día / semana / mes.
   *
   * A diferencia de `getProjection`, emite un punto por cada bucket del rango
   * aunque no haya movimientos: la curva del dashboard necesita ser continua.
   * Sólo acepta el filtro de cuenta a propósito — el saldo debe seguir siendo
   * el saldo real aunque el usuario filtre por categoría o por monto.
   */
  async getBalanceSeries(
    userId: string,
    {
      from,
      to,
      granularity,
      accountId,
    }: { from: Date; to: Date; granularity: Granularity; accountId?: string },
  ): Promise<CashflowBalanceBucket[]> {
    const buckets = eachBucket(from, to, granularity);
    if (buckets.length === 0) {
      return [];
    }

    const seriesStart = buckets[0];
    const openingBalance = await this.getBalanceAt(
      userId,
      seriesStart,
      accountId,
      true,
    );

    const dailyTx = await this.prisma.transaction.groupBy({
      by: ['date', 'type'],
      where: {
        userId,
        ...(accountId ? { accountId } : { account: { isArchived: false } }),
        date: { gte: seriesStart, lte: to },
      },
      _sum: { amount: true },
    });

    const byBucket = new Map<string, { income: number; expense: number }>();
    for (const row of dailyTx) {
      const key = toDateKey(bucketStart(row.date, granularity));
      const entry = byBucket.get(key) ?? { income: 0, expense: 0 };
      const amount = Number(row._sum.amount ?? 0);
      if (row.type === TransactionType.INCOME) {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
      byBucket.set(key, entry);
    }

    const today = todayUtc();
    const todayBucket = bucketStart(today, granularity).getTime();

    let running = openingBalance;
    return buckets.map((bucket) => {
      const { income, expense } = byBucket.get(toDateKey(bucket)) ?? {
        income: 0,
        expense: 0,
      };
      const bucketOpening = running;
      const closingBalance = bucketOpening + income - expense;
      running = closingBalance;
      return {
        bucket,
        openingBalance: bucketOpening,
        closingBalance,
        income,
        expense,
        isNegative: closingBalance < 0,
        isFuture: bucket.getTime() > todayBucket,
      };
    });
  }

  /**
   * Saldo acumulado de una cuenta (o de todas) hasta una fecha.
   * `exclusive` = true excluye la fecha exacta (para calcular el saldo de apertura de un rango).
   */
  async getBalanceAt(
    userId: string,
    at: Date,
    accountId?: string,
    exclusive = false,
  ): Promise<number> {
    // Las cuentas archivadas son borrados suaves: no cuentan para el saldo, ni
    // con su saldo inicial ni con sus movimientos. Así el total, las tarjetas de
    // wallets y la curva de saldo hablan siempre del mismo conjunto de cuentas.
    const accountFilter = accountId
      ? { id: accountId }
      : { isArchived: false };

    const accounts = await this.prisma.account.findMany({
      where: { userId, ...accountFilter },
    });
    const openingBalanceSum = accounts.reduce(
      (sum, a) => sum + Number(a.openingBalance),
      0,
    );

    const agg = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        ...(accountId ? { accountId } : { account: { isArchived: false } }),
        date: exclusive ? { lt: at } : { lte: at },
      },
      _sum: { amount: true },
    });

    const income = Number(
      agg.find((a) => a.type === TransactionType.INCOME)?._sum.amount ?? 0,
    );
    const expense = Number(
      agg.find((a) => a.type === TransactionType.EXPENSE)?._sum.amount ?? 0,
    );

    return openingBalanceSum + income - expense;
  }
}
