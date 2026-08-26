import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { archivedResult, deletedResult } from '../../common/delete-result';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApplyExpenseTemplateDto,
  CreateExpenseTemplateDto,
  UpdateExpenseTemplateDto,
} from './dto';

@Injectable()
export class ExpenseTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  findAll(userId: string) {
    return this.prisma.expenseTemplate.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  async findOne(userId: string, id: string) {
    const template = await this.prisma.expenseTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return template;
  }

  private async assertAccountOwnership(userId: string, accountId?: string) {
    if (!accountId) {
      return;
    }
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new BadRequestException('La cuenta indicada no existe');
    }
  }

  async create(userId: string, dto: CreateExpenseTemplateDto) {
    await this.assertAccountOwnership(userId, dto.accountId);
    await this.categoriesService.assertTypeMatches(
      userId,
      dto.categoryId,
      dto.type,
    );
    return this.prisma.expenseTemplate.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateExpenseTemplateDto) {
    const existing = await this.findOne(userId, id);
    await this.assertAccountOwnership(userId, dto.accountId);
    if (dto.type !== undefined || dto.categoryId !== undefined) {
      const effectiveType: TransactionType = dto.type ?? existing.type;
      const effectiveCategoryId = dto.categoryId ?? existing.categoryId;
      await this.categoriesService.assertTypeMatches(
        userId,
        effectiveCategoryId,
        effectiveType,
      );
    }
    const result = await this.prisma.expenseTemplate.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    const usageCount = await this.prisma.transaction.count({
      where: { expenseTemplateId: id, userId },
    });

    if (usageCount > 0) {
      const template = await this.prisma.expenseTemplate.update({
        where: { id },
        data: { isArchived: true },
      });
      return archivedResult(id, template);
    }

    await this.prisma.expenseTemplate.delete({ where: { id } });
    return deletedResult(id);
  }

  async apply(userId: string, id: string, dto: ApplyExpenseTemplateDto) {
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
        return { transaction: existing, alreadyExisted: true };
      }
    }

    const template = await this.findOne(userId, id);

    const accountId = dto.accountId ?? template.accountId;
    if (!accountId) {
      throw new BadRequestException(
        'Debes indicar una cuenta para aplicar la plantilla',
      );
    }
    const amount = dto.amount ?? template.suggestedAmount;
    if (amount === null || amount === undefined) {
      throw new BadRequestException(
        'Debes indicar un monto para aplicar la plantilla',
      );
    }
    await this.assertAccountOwnership(userId, accountId);

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        accountId,
        categoryId: template.categoryId,
        type: template.type,
        amount,
        date: dto.date,
        description: dto.description ?? template.name,
        source: 'TEMPLATE',
        expenseTemplateId: template.id,
        clientRequestId: dto.clientRequestId,
      },
    });
    return { transaction, alreadyExisted: false };
  }
}
