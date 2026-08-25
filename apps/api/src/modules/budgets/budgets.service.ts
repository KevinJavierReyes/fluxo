import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { todayUtc } from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetStatusQueryDto, CreateBudgetDto, UpdateBudgetDto } from './dto';

function resolveMonthRange(month?: string): { start: Date; end: Date } {
  const today = todayUtc();
  const [year, monthIndex1] = month
    ? month.split('-').map(Number)
    : [today.getUTCFullYear(), today.getUTCMonth() + 1];
  const start = new Date(Date.UTC(year, monthIndex1 - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex1, 0));
  return { start, end };
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });
    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return budget;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const group = await this.prisma.categoryGroup.findFirst({
      where: { id: dto.categoryGroupId, userId },
    });
    if (!group) {
      throw new BadRequestException('El grupo de categoría indicado no existe');
    }
    return this.prisma.budget.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const result = await this.prisma.budget.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.budget.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getStatus(userId: string, query: BudgetStatusQueryDto) {
    const { start, end } = resolveMonthRange(query.month);

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        effectiveFrom: { lte: end },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
      },
      include: { categoryGroup: true },
    });

    return Promise.all(
      budgets.map(async (budget) => {
        const agg = await this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            date: { gte: start, lte: end },
            category: { groupId: budget.categoryGroupId },
          },
          _sum: { amount: true },
        });

        const spentAmount = Number(agg._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);
        const remainingAmount = budgetAmount - spentAmount;
        const percentUsed =
          budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

        return {
          categoryGroupId: budget.categoryGroupId,
          categoryGroupName: budget.categoryGroup.name,
          budgetAmount,
          spentAmount,
          remainingAmount,
          percentUsed,
          isOverBudget: spentAmount > budgetAmount,
        };
      }),
    );
  }
}
