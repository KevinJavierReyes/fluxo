import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavingsGoal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContributeSavingsGoalDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto';

@Injectable()
export class SavingsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async withProgress(goal: SavingsGoal) {
    const agg = await this.prisma.transaction.aggregate({
      where: { savingsGoalId: goal.id },
      _sum: { amount: true },
    });
    return { ...goal, progress: Number(agg._sum.amount ?? 0) };
  }

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
    });
    return Promise.all(goals.map((g) => this.withProgress(g)));
  }

  private async findRaw(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!goal) {
      throw new NotFoundException('Meta de ahorro no encontrada');
    }
    return goal;
  }

  async findOne(userId: string, id: string) {
    return this.withProgress(await this.findRaw(userId, id));
  }

  async create(userId: string, dto: CreateSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: { ...dto, userId },
    });
    return this.withProgress(goal);
  }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    const result = await this.prisma.savingsGoal.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Meta de ahorro no encontrada');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findRaw(userId, id);

    const contributionCount = await this.prisma.transaction.count({
      where: { savingsGoalId: id, userId },
    });

    if (contributionCount > 0) {
      return this.prisma.savingsGoal.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    await this.prisma.savingsGoal.delete({ where: { id } });
    return { id, deleted: true };
  }

  async contribute(userId: string, id: string, dto: ContributeSavingsGoalDto) {
    const goal = await this.findRaw(userId, id);

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new BadRequestException('La cuenta indicada no existe');
    }

    const categoryId = await this.resolveCategoryId(userId, dto.categoryId);

    await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId,
        type: 'EXPENSE',
        amount: dto.amount,
        date: dto.date,
        description: dto.description ?? `Aporte a ${goal.name}`,
        savingsGoalId: id,
      },
    });

    return this.findOne(userId, id);
  }

  private async resolveCategoryId(
    userId: string,
    categoryId?: string,
  ): Promise<string> {
    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId },
      });
      if (!category) {
        throw new BadRequestException('La categoría indicada no existe');
      }
      return category.id;
    }

    const savingsCategory = await this.prisma.category.findFirst({
      where: {
        userId,
        group: { name: { equals: 'Ahorro', mode: 'insensitive' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    if (!savingsCategory) {
      throw new BadRequestException(
        'No se encontró una categoría de Ahorro. Crea una o indica categoryId.',
      );
    }
    return savingsCategory.id;
  }
}
