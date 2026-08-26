import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavingsGoal } from '@prisma/client';
import { archivedResult, deletedResult } from '../../common/delete-result';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContributeSavingsGoalDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto';

@Injectable()
export class SavingsGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

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
      take: 200,
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
      const goal = await this.prisma.savingsGoal.update({
        where: { id },
        data: { isArchived: true },
      });
      return archivedResult(id, await this.withProgress(goal));
    }

    await this.prisma.savingsGoal.delete({ where: { id } });
    return deletedResult(id);
  }

  async contribute(userId: string, id: string, dto: ContributeSavingsGoalDto) {
    if (dto.clientRequestId) {
      const existing = await this.prisma.transaction.findUnique({
        where: {
          userId_clientRequestId: {
            userId,
            clientRequestId: dto.clientRequestId,
          },
        },
      });
      if (existing) {
        return {
          goal: await this.findOne(userId, id),
          transactionId: existing.id,
          alreadyExisted: true,
        };
      }
    }

    const goal = await this.findRaw(userId, id);

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new BadRequestException('La cuenta indicada no existe');
    }

    const categoryId = await this.resolveCategoryId(userId, dto.categoryId);

    const contribution = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId,
        type: 'EXPENSE',
        amount: dto.amount,
        date: dto.date,
        description: dto.description ?? `Aporte a ${goal.name}`,
        savingsGoalId: id,
        source: 'SAVINGS',
        clientRequestId: dto.clientRequestId,
      },
    });

    return {
      goal: await this.findOne(userId, id),
      transactionId: contribution.id,
      alreadyExisted: false,
    };
  }

  private async resolveCategoryId(
    userId: string,
    categoryId?: string,
  ): Promise<string> {
    if (categoryId) {
      const category = await this.categoriesService.assertTypeMatches(
        userId,
        categoryId,
        'EXPENSE',
      );
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
