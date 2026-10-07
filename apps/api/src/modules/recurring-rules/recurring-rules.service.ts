import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RecurringRule, TransactionStatus } from '@prisma/client';
import { addDays, todayForUser, todayUtc } from '../../common/date.util';
import { deletedResult } from '../../common/delete-result';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringRuleDto, UpdateRecurringRuleDto } from './dto';
import { generateOccurrenceDates } from './occurrence-generator';

export const RECURRING_HORIZON_DAYS = 365;

@Injectable()
export class RecurringRulesService {
  private readonly logger = new Logger(RecurringRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  findAll(userId: string) {
    return this.prisma.recurringRule.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      take: 200,
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const rule = await this.prisma.recurringRule.findFirst({
      where: { id, userId },
    });
    if (!rule) {
      throw new NotFoundException('Regla recurrente no encontrada');
    }
    return rule;
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

  async create(userId: string, dto: CreateRecurringRuleDto) {
    await this.assertAccountOwnership(userId, dto.accountId);
    await this.categoriesService.assertTypeMatches(
      userId,
      dto.categoryId,
      dto.type,
    );
    const rule = await this.prisma.recurringRule.create({
      data: { ...dto, userId },
    });
    await this.generateOccurrencesFor(rule);
    return this.findOne(userId, rule.id);
  }

  async update(userId: string, id: string, dto: UpdateRecurringRuleDto) {
    const existing = await this.findOne(userId, id);
    await this.assertAccountOwnership(userId, dto.accountId);
    if (dto.categoryId !== undefined) {
      // El tipo de una regla recurrente no se puede editar (no está en el
      // DTO de update), así que la categoría siempre se valida contra el
      // tipo original de la regla.
      await this.categoriesService.assertTypeMatches(
        userId,
        dto.categoryId,
        existing.type,
      );
    }

    const result = await this.prisma.recurringRule.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Regla recurrente no encontrada');
    }

    const updated = await this.findOne(userId, id);
    if (dto.isActive === true && !existing.isActive) {
      await this.generateOccurrencesFor(updated);
    }
    if (dto.autoConfirm === true && !existing.autoConfirm) {
      await this.confirmDueOccurrences(updated);
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.recurringRule.delete({ where: { id } });
    return deletedResult(id);
  }

  private async getOwnerToday(userId: string): Promise<Date> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return todayForUser(user?.timezone ?? 'UTC');
  }

  /**
   * Para reglas con `autoConfirm`: pasa a CONFIRMED las ocurrencias PENDING
   * cuya fecha ya llegó (según la zona horaria del dueño). Devuelve cuántas.
   */
  async confirmDueOccurrences(rule: RecurringRule): Promise<number> {
    if (!rule.autoConfirm || !rule.isActive) {
      return 0;
    }
    const today = await this.getOwnerToday(rule.userId);
    const result = await this.prisma.transaction.updateMany({
      where: {
        recurringRuleId: rule.id,
        status: TransactionStatus.PENDING,
        date: { lte: today },
      },
      data: { status: TransactionStatus.CONFIRMED },
    });
    return result.count;
  }

  /** Materializa las ocurrencias faltantes de una regla hasta el horizonte rodante. */
  async generateOccurrencesFor(
    rule: RecurringRule,
    horizonDays = RECURRING_HORIZON_DAYS,
  ) {
    if (!rule.isActive) {
      return;
    }

    const horizon = addDays(todayUtc(), horizonDays);
    const from = rule.lastGeneratedUntil
      ? addDays(rule.lastGeneratedUntil, 1)
      : rule.startDate;
    if (from.getTime() > horizon.getTime()) {
      return;
    }

    const dates = generateOccurrenceDates(rule, from, horizon);

    if (dates.length > 0) {
      // Las ocurrencias futuras nacen PENDING (proyectadas) hasta que se
      // confirmen; las que ya llegaron (regla creada con fecha de inicio
      // pasada) se registran directamente como CONFIRMED.
      const today = await this.getOwnerToday(rule.userId);
      await this.prisma.transaction.createMany({
        data: dates.map((date) => ({
          userId: rule.userId,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          date,
          description: rule.description,
          source: 'RECURRING' as const,
          status:
            date.getTime() > today.getTime()
              ? TransactionStatus.PENDING
              : TransactionStatus.CONFIRMED,
          recurringRuleId: rule.id,
        })),
      });
    }

    await this.prisma.recurringRule.update({
      where: { id: rule.id },
      data: { lastGeneratedUntil: horizon },
    });

    this.logger.log(
      `Regla ${rule.id}: generadas ${dates.length} ocurrencias hasta ${horizon.toISOString().slice(0, 10)}`,
    );
  }
}
