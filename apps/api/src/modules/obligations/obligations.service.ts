import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';
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
      where: { userId },
      orderBy: { creditorName: 'asc' },
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

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.obligation.delete({ where: { id } });
    return { id, deleted: true };
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

    return this.prisma.obligation.update({
      where: { id },
      data: { linkedRecurringRuleId: rule.id },
    });
  }
}
