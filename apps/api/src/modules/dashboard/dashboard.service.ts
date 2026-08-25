import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { addDays, todayUtc } from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CashflowService } from '../cashflow/cashflow.service';

const PROJECTION_HORIZON_DAYS = 90;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashflowService: CashflowService,
  ) {}

  async getSummary(userId: string) {
    const today = todayUtc();
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
