import { Injectable, NotFoundException } from '@nestjs/common';
import { archivedResult, deletedResult } from '../../common/delete-result';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return account;
  }

  create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    // RecurringRule, ExpenseTemplate y Transfer ahora tienen FK real hacia
    // Account (Restrict/SetNull); si hay referencias, archivar en vez de
    // intentar un borrado físico que la base rechazaría.
    const [
      transactionCount,
      recurringRuleCount,
      expenseTemplateCount,
      transferCount,
    ] = await Promise.all([
      this.prisma.transaction.count({ where: { accountId: id, userId } }),
      this.prisma.recurringRule.count({ where: { accountId: id, userId } }),
      this.prisma.expenseTemplate.count({
        where: { accountId: id, userId },
      }),
      this.prisma.transfer.count({
        where: { userId, OR: [{ fromAccountId: id }, { toAccountId: id }] },
      }),
    ]);

    if (
      transactionCount > 0 ||
      recurringRuleCount > 0 ||
      expenseTemplateCount > 0 ||
      transferCount > 0
    ) {
      const account = await this.prisma.account.update({
        where: { id },
        data: { isArchived: true },
      });
      return archivedResult(id, account);
    }

    await this.prisma.account.delete({ where: { id } });
    return deletedResult(id);
  }
}
