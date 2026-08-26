import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';
import { archivedResult } from '../../common/delete-result';
import { PrismaService } from '../../prisma/prisma.service';
import { RecurringRulesService } from '../recurring-rules/recurring-rules.service';
import {
  CreateObligationDto,
  LinkObligationRecurringDto,
  UpdateObligationDto,
} from './dto';

@Injectable()
export class ObligationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringRulesService: RecurringRulesService,
  ) {}

  findAll(userId: string) {
    return this.prisma.obligation.findMany({
      where: { userId, isArchived: false },
      orderBy: { creditorName: 'asc' },
      take: 200,
    });
  }

  async findOne(userId: string, id: string) {
    const obligation = await this.prisma.obligation.findFirst({
      where: { id, userId },
    });
    if (!obligation) {
      throw new NotFoundException('Obligación no encontrada');
    }
    return obligation;
  }

  create(userId: string, dto: CreateObligationDto) {
    return this.prisma.obligation.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateObligationDto) {
    const result = await this.prisma.obligation.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Obligación no encontrada');
    }
    return this.findOne(userId, id);
  }

  /**
   * Nada referencia una Obligation (es la obligación la que apunta hacia
   * afuera, a RecurringRule), pero igual se archiva en vez de borrar físico
   * para no perder el historial de deudas ya saldadas.
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const obligation = await this.prisma.obligation.update({
      where: { id },
      data: { isArchived: true },
    });
    return archivedResult(id, obligation);
  }

  async linkRecurring(
    userId: string,
    id: string,
    dto: LinkObligationRecurringDto,
  ) {
    const obligation = await this.findOne(userId, id);
    if (obligation.linkedRecurringRuleId) {
      throw new BadRequestException(
        'Esta obligación ya tiene un pago automático vinculado',
      );
    }

    const rule = await this.recurringRulesService.create(userId, {
      name: `Pago: ${obligation.creditorName}`,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: TransactionType.EXPENSE,
      amount: Number(obligation.monthlyPayment),
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      byMonthDay: dto.byMonthDay,
      startDate: dto.startDate,
    });

    // recurringRulesService.create ya hizo sus propias escrituras (regla +
    // ocurrencias materializadas) con su propia instancia de Prisma, así que
    // no se puede envolver junto con este update en un $transaction real.
    // Si este último paso falla, se compensa borrando la regla recién creada
    // para no dejarla huérfana (con sus transacciones generadas colgando).
    try {
      return await this.prisma.obligation.update({
        where: { id },
        data: { linkedRecurringRuleId: rule.id },
      });
    } catch (error) {
      await this.recurringRulesService.remove(userId, rule.id).catch(() => {
        // Si ni siquiera se puede compensar, no hay más que hacer aquí; el
        // error original es el que importa reportar.
      });
      throw error;
    }
  }
}
