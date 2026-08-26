import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { archivedResult, deletedResult } from '../../common/delete-result';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCategoryDto,
  CreateCategoryGroupDto,
  UpdateCategoryDto,
  UpdateCategoryGroupDto,
} from './dto';

const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: 'ingreso',
  EXPENSE: 'gasto',
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllGroups(userId: string) {
    return this.prisma.categoryGroup.findMany({
      where: { userId, isArchived: false },
      include: {
        categories: {
          where: { isArchived: false },
          orderBy: { sortOrder: 'asc' },
          take: 200,
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: 100,
    });
  }

  /** Lista plana de categorías (sin agrupar), para resolución por nombre. */
  findAllFlat(userId: string) {
    return this.prisma.category.findMany({
      where: { userId, isArchived: false },
      include: { group: { select: { id: true, name: true, type: true } } },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  async findGroup(userId: string, id: string) {
    const group = await this.prisma.categoryGroup.findFirst({
      where: { id, userId },
    });
    if (!group) {
      throw new NotFoundException('Grupo de categoría no encontrado');
    }
    return group;
  }

  createGroup(userId: string, dto: CreateCategoryGroupDto) {
    return this.prisma.categoryGroup.create({ data: { ...dto, userId } });
  }

  async updateGroup(userId: string, id: string, dto: UpdateCategoryGroupDto) {
    const result = await this.prisma.categoryGroup.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Grupo de categoría no encontrado');
    }
    return this.findGroup(userId, id);
  }

  async removeGroup(userId: string, id: string) {
    await this.findGroup(userId, id);

    const transactionCount = await this.prisma.transaction.count({
      where: { userId, category: { groupId: id } },
    });

    if (transactionCount > 0) {
      const group = await this.prisma.categoryGroup.update({
        where: { id },
        data: { isArchived: true },
      });
      return archivedResult(id, group);
    }

    await this.prisma.categoryGroup.delete({ where: { id } });
    return deletedResult(id);
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    await this.findGroup(userId, dto.groupId);
    return this.prisma.category.create({ data: { ...dto, userId } });
  }

  /**
   * Verifica que una categoría exista, pertenezca al usuario y que su tipo
   * (heredado del grupo) coincida con el tipo de transacción indicado.
   * Si no coincide, el error incluye las categorías válidas de ese tipo
   * para que quien llame (incluido un agente MCP) pueda repreguntar con
   * opciones concretas en vez de fallar a ciegas.
   */
  async assertTypeMatches(
    userId: string,
    categoryId: string,
    type: TransactionType,
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      include: { group: true },
    });
    if (!category) {
      throw new BadRequestException('La categoría indicada no existe');
    }
    if (category.group.type !== type) {
      const validCategories = await this.prisma.category.findMany({
        where: {
          userId,
          isArchived: false,
          group: { type, isArchived: false },
        },
        select: { id: true, name: true, group: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      throw new BadRequestException({
        message: `La categoría "${category.name}" es de ${TRANSACTION_TYPE_LABEL[category.group.type]}, no de ${TRANSACTION_TYPE_LABEL[type]}.`,
        error: 'category_type_mismatch',
        validCategories: validCategories.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.group.name,
        })),
      });
    }
    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    if (dto.groupId) {
      await this.findGroup(userId, dto.groupId);
    }
    const result = await this.prisma.category.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    // RecurringRule y ExpenseTemplate tienen FK real hacia Category
    // (Restrict); si hay referencias, archivar en vez de que la base
    // rechace el borrado físico.
    const [transactionCount, recurringRuleCount, expenseTemplateCount] =
      await Promise.all([
        this.prisma.transaction.count({ where: { categoryId: id, userId } }),
        this.prisma.recurringRule.count({ where: { categoryId: id, userId } }),
        this.prisma.expenseTemplate.count({
          where: { categoryId: id, userId },
        }),
      ]);

    if (
      transactionCount > 0 ||
      recurringRuleCount > 0 ||
      expenseTemplateCount > 0
    ) {
      const category = await this.prisma.category.update({
        where: { id },
        data: { isArchived: true },
      });
      return archivedResult(id, category);
    }

    await this.prisma.category.delete({ where: { id } });
    return deletedResult(id);
  }
}
