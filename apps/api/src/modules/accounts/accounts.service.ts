import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
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

    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id, userId },
    });

    if (transactionCount > 0) {
      return this.prisma.account.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    await this.prisma.account.delete({ where: { id } });
    return { id, deleted: true };
  }
}
