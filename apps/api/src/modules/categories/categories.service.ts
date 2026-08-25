import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCategoryDto,
  CreateCategoryGroupDto,
  UpdateCategoryDto,
  UpdateCategoryGroupDto,
} from './dto';

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
        },
      },
      orderBy: { sortOrder: 'asc' },
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
      return this.prisma.categoryGroup.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    await this.prisma.categoryGroup.delete({ where: { id } });
    return { id, deleted: true };
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

    const transactionCount = await this.prisma.transaction.count({
      where: { categoryId: id, userId },
    });

    if (transactionCount > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    await this.prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }
}
