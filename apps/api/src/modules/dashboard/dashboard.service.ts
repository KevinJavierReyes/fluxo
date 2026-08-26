import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import type { OverviewQuery } from '@fluxo/shared';
import {
  addDays,
  bucketStart,
  eachBucket,
  toDateKey,
  todayForUser,
} from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CashflowService } from '../cashflow/cashflow.service';

const PROJECTION_HORIZON_DAYS = 90;

type OverviewTransaction = {
  date: Date;
  type: TransactionType;
  amount: Prisma.Decimal;
  category: {
    group: { id: string; name: string; color: string; icon: string };
  };
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashflowService: CashflowService,
  ) {}

  async getSummary(userId: string, timezone: string) {
    const today = todayForUser(timezone);
    const horizon = addDays(today, PROJECTION_HORIZON_DAYS);

    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
    });

    const accountBalances = await Promise.all(
      accounts.map(async (account) => ({
        id: account.id,
        name: account.name,
        balance: await this.cashflowService.getBalanceAt(
          userId,
          today,
          account.id,
        ),
      })),
    );

    const totalBalance = accountBalances.reduce((sum, a) => sum + a.balance, 0);

    const projection = await this.cashflowService.getProjection(userId, {
      from: today,
      to: horizon,
    });

    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const categoryBreakdown = await this.getCategoryBreakdown(
      userId,
      monthStart,
      today,
    );

    return {
      totalBalance,
      accounts: accountBalances,
      projection,
      categoryBreakdown,
    };
  }

  /**
   * Vista general por rango de fechas: preview de wallets, KPIs del periodo,
   * serie de saldo (que continúa hacia el futuro cuando el rango lo incluye),
   * movimientos por bucket y desglose por grupo de categoría.
   */
  async getOverview(userId: string, query: OverviewQuery, timezone: string) {
    const { from, to, granularity, accountId } = query;
    const today = todayForUser(timezone);

    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
    });

    // Las tarjetas de wallets muestran siempre el saldo real de hoy: no las
    // afectan los filtros de categoría ni de monto.
    const wallets = await Promise.all(
      accounts.map(async (account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: await this.cashflowService.getBalanceAt(
          userId,
          today,
          account.id,
        ),
      })),
    );
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    const balanceSeries = await this.cashflowService.getBalanceSeries(
      userId,
      { from, to, granularity, accountId },
      timezone,
    );

    const transactions = await this.prisma.transaction.findMany({
      where: this.buildTransactionWhere(userId, query),
      select: {
        date: true,
        type: true,
        amount: true,
        category: {
          select: {
            group: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        },
      },
    });

    const changesSeries = this.buildChangesSeries(
      transactions,
      from,
      to,
      granularity,
      today,
    );

    let periodIncome = 0;
    let periodExpenses = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) {
        periodIncome += amount;
      } else {
        periodExpenses += amount;
      }
    }

    const amountRange = await this.getAmountRange(userId, query);

    // La alerta de saldo en rojo mira siempre los próximos 90 días, sin importar
    // el rango ni los filtros que el usuario tenga puestos.
    const projection = await this.cashflowService.getProjection(userId, {
      from: today,
      to: addDays(today, PROJECTION_HORIZON_DAYS),
    });

    const endingBalance =
      balanceSeries.length > 0
        ? balanceSeries[balanceSeries.length - 1].closingBalance
        : totalBalance;

    return {
      today,
      hasFuture: to.getTime() > today.getTime(),
      granularity,
      totalBalance,
      wallets,
      totals: {
        endingBalance,
        periodChange: periodIncome - periodExpenses,
        periodIncome,
        periodExpenses,
        transactionCount: transactions.length,
      },
      balanceSeries,
      changesSeries,
      incomeByGroup: this.buildGroupBreakdown(
        transactions,
        TransactionType.INCOME,
      ),
      expenseByGroup: this.buildGroupBreakdown(
        transactions,
        TransactionType.EXPENSE,
      ),
      amountRange,
      projection,
    };
  }

  private buildTransactionWhere(
    userId: string,
    {
      from,
      to,
      accountId,
      categoryGroupIds,
      minAmount,
      maxAmount,
    }: OverviewQuery,
  ): Prisma.TransactionWhereInput {
    const amount: Prisma.DecimalFilter = {};
    if (minAmount !== undefined) amount.gte = minAmount;
    if (maxAmount !== undefined) amount.lte = maxAmount;

    return {
      userId,
      date: { gte: from, lte: to },
      ...(accountId ? { accountId } : { account: { isArchived: false } }),
      ...(categoryGroupIds && categoryGroupIds.length > 0
        ? { category: { groupId: { in: categoryGroupIds } } }
        : {}),
      ...(Object.keys(amount).length > 0 ? { amount } : {}),
    };
  }

  /** Rango de montos disponible en el periodo, para acotar el slider del filtro. */
  private async getAmountRange(userId: string, query: OverviewQuery) {
    const agg = await this.prisma.transaction.aggregate({
      where: this.buildTransactionWhere(userId, {
        ...query,
        minAmount: undefined,
        maxAmount: undefined,
      }),
      _min: { amount: true },
      _max: { amount: true },
    });

    return {
      min: Math.floor(Number(agg._min.amount ?? 0)),
      max: Math.ceil(Number(agg._max.amount ?? 0)),
    };
  }

  private buildChangesSeries(
    transactions: OverviewTransaction[],
    from: Date,
    to: Date,
    granularity: OverviewQuery['granularity'],
    today: Date,
  ) {
    const byBucket = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const key = toDateKey(bucketStart(tx.date, granularity));
      const entry = byBucket.get(key) ?? { income: 0, expense: 0 };
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
      byBucket.set(key, entry);
    }

    const todayBucket = bucketStart(today, granularity).getTime();
    return eachBucket(from, to, granularity).map((bucket) => {
      const { income, expense } = byBucket.get(toDateKey(bucket)) ?? {
        income: 0,
        expense: 0,
      };
      return {
        bucket,
        income,
        expense,
        net: income - expense,
        isFuture: bucket.getTime() > todayBucket,
      };
    });
  }

  private buildGroupBreakdown(
    transactions: OverviewTransaction[],
    type: TransactionType,
  ) {
    const byGroup = new Map<
      string,
      {
        groupId: string;
        name: string;
        color: string;
        icon: string;
        amount: number;
        transactionCount: number;
      }
    >();

    let total = 0;
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      const group = tx.category.group;
      const amount = Number(tx.amount);
      total += amount;
      const entry = byGroup.get(group.id) ?? {
        groupId: group.id,
        name: group.name,
        color: group.color,
        icon: group.icon,
        amount: 0,
        transactionCount: 0,
      };
      entry.amount += amount;
      entry.transactionCount += 1;
      byGroup.set(group.id, entry);
    }

    return Array.from(byGroup.values())
      .map((entry) => ({
        ...entry,
        percentage: total > 0 ? (entry.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private async getCategoryBreakdown(userId: string, start: Date, end: Date) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: grouped.map((g) => g.categoryId) } },
      include: { group: true },
    });
    const groupNameByCategoryId = new Map(
      categories.map((c) => [c.id, c.group.name]),
    );

    const byGroup = new Map<string, number>();
    for (const row of grouped) {
      const groupName = groupNameByCategoryId.get(row.categoryId) ?? 'Otros';
      const amount = Number(row._sum.amount ?? 0);
      byGroup.set(groupName, (byGroup.get(groupName) ?? 0) + amount);
    }

    return Array.from(byGroup.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
}
