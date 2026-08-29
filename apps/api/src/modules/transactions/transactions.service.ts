import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionSource, TransactionType } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from './dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(userId: string, query: ListTransactionsQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.accountIds && query.accountIds.length > 0
        ? { accountId: { in: query.accountIds } }
        : query.accountId
          ? { accountId: query.accountId }
          : {}),
      ...(query.categoryIds && query.categoryIds.length > 0
        ? { categoryId: { in: query.categoryIds } }
        : query.categoryId
          ? { categoryId: query.categoryId }
          : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            description: { contains: query.q, mode: 'insensitive' as const },
          }
        : {}),
    };

    // Se pide una fila de más para saber si hay siguiente página sin un
    // segundo round-trip; el cursor se posiciona por (date, id) porque el
    // orden principal (date) no es único por sí solo.
    const rows = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
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

  /**
   * `source` lo fija quien llama (REST siempre usa MANUAL; el servidor MCP
   * pasa MCP explícito) — así `source` refleja de verdad cómo se creó la
   * fila, no solo qué endpoint la tocó.
   *
   * Si `dto.clientRequestId` ya existe para este usuario, no se duplica la
   * transacción: se devuelve la que ya existía con `alreadyExisted: true`.
   * El unique constraint `[userId, clientRequestId]` es lo que hace esto
   * seguro ante llamadas concurrentes (no es un check-then-create separado).
   */
  async create(
    userId: string,
    dto: CreateTransactionDto,
    source: TransactionSource = TransactionSource.MANUAL,
  ): Promise<{
    transaction: Prisma.TransactionGetPayload<object>;
    alreadyExisted: boolean;
  }> {
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

    await this.assertAccountOwnership(userId, dto.accountId);
    await this.categoriesService.assertTypeMatches(
      userId,
      dto.categoryId,
      dto.type,
    );
    const transaction = await this.prisma.transaction.create({
      data: { ...dto, userId, source },
    });
    return { transaction, alreadyExisted: false };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
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

  /**
   * Sin restricción por `source`: incluye transacciones `RECURRING`, ya que
   * esta es la vía de limpieza manual para las que quedaron generadas de una
   * regla recurrente que ya no se quiere (borrar la regla no las elimina).
   */
  async removeMany(userId: string, ids: string[]) {
    const result = await this.prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId },
    });
    return { deletedCount: result.count };
  }
}
