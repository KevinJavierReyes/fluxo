import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApplyExpenseTemplateDto,
  CreateExpenseTemplateDto,
  UpdateExpenseTemplateDto,
} from './dto';

@Injectable()
export class ExpenseTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.expenseTemplate.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
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

  private async assertOwnership(
    userId: string,
    accountId?: string,
    categoryId?: string,
  ) {
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new BadRequestException('La cuenta indicada no existe');
      }
    }
    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId },
      });
      if (!category) {
        throw new BadRequestException('La categoría indicada no existe');
      }
    }
  }

  async create(userId: string, dto: CreateExpenseTemplateDto) {
    await this.assertOwnership(userId, dto.accountId, dto.categoryId);
    return this.prisma.expenseTemplate.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateExpenseTemplateDto) {
    if (dto.accountId || dto.categoryId) {
      await this.assertOwnership(userId, dto.accountId, dto.categoryId);
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
      return this.prisma.expenseTemplate.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    await this.prisma.expenseTemplate.delete({ where: { id } });
    return { id, deleted: true };
  }

  async apply(userId: string, id: string, dto: ApplyExpenseTemplateDto) {
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
    await this.assertOwnership(userId, accountId, template.categoryId);

    return this.prisma.transaction.create({
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
      },
    });
  }
}
