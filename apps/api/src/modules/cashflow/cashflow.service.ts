import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
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
   * Saldo acumulado de una cuenta (o de todas) hasta una fecha.
   * `exclusive` = true excluye la fecha exacta (para calcular el saldo de apertura de un rango).
   */
  async getBalanceAt(
    userId: string,
    at: Date,
    accountId?: string,
    exclusive = false,
  ): Promise<number> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, ...(accountId ? { id: accountId } : {}) },
    });
    const openingBalanceSum = accounts.reduce(
      (sum, a) => sum + Number(a.openingBalance),
      0,
    );

    const agg = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        ...(accountId ? { accountId } : {}),
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
