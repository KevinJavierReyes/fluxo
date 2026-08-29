import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  description?: string;
  clientRequestId?: string;
}

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Una sola fila representa las dos patas de la transferencia (no dos
   * Transaction vinculadas), así que no hace falta `$transaction` para la
   * atomicidad — un solo `create` ya es atómico. La idempotencia por
   * clientRequestId sigue el mismo patrón que TransactionsService.create.
   */
  async create(userId: string, input: CreateTransferInput) {
    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException(
        'La cuenta de origen y destino no pueden ser la misma',
      );
    }

    if (input.clientRequestId) {
      const existing = await this.prisma.transfer.findUnique({
        where: {
          userId_clientRequestId: {
            userId,
            clientRequestId: input.clientRequestId,
          },
        },
      });
      if (existing) {
        return { transfer: existing, alreadyExisted: true };
      }
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.account.findFirst({
        where: { id: input.fromAccountId, userId },
      }),
      this.prisma.account.findFirst({
        where: { id: input.toAccountId, userId },
      }),
    ]);
    if (!fromAccount) {
      throw new BadRequestException('La cuenta de origen no existe');
    }
    if (!toAccount) {
      throw new BadRequestException('La cuenta de destino no existe');
    }

    const transfer = await this.prisma.transfer.create({
      data: {
        userId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        date: input.date,
        description: input.description,
        clientRequestId: input.clientRequestId,
      },
    });

    return { transfer, alreadyExisted: false };
  }

  async findOne(userId: string, id: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, userId },
    });
    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada');
    }
    return transfer;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transfer.delete({ where: { id } });
  }
}
