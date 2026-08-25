import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from './dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, query: ListTransactionsQueryDto) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }
    return transaction;
  }

  private async assertOwnership(
    userId: string,
    accountId: string | undefined,
    categoryId: string | undefined,
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

  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertOwnership(userId, dto.accountId, dto.categoryId);
    return this.prisma.transaction.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);
    await this.assertOwnership(userId, dto.accountId, dto.categoryId);

    const result = await this.prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        ...dto,
        isModified: existing.source !== 'MANUAL' ? true : existing.isModified,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('Transacción no encontrada');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { id, deleted: true };
  }
}
