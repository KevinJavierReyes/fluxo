import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { addDays, todayUtc } from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RECURRING_HORIZON_DAYS,
  RecurringRulesService,
} from './recurring-rules.service';

@Injectable()
export class RecurringRulesGenerator {
  private readonly logger = new Logger(RecurringRulesGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringRulesService: RecurringRulesService,
  ) {}

  @Cron('10 0 * * *')
  async extendActiveRules() {
    const horizon = addDays(todayUtc(), RECURRING_HORIZON_DAYS);

    const rules = await this.prisma.recurringRule.findMany({
      where: {
        isActive: true,
        OR: [
          { lastGeneratedUntil: null },
          { lastGeneratedUntil: { lt: horizon } },
        ],
      },
    });

    for (const rule of rules) {
      await this.recurringRulesService.generateOccurrencesFor(rule);
    }

    this.logger.log(
      `Horizonte de recurrencias extendido para ${rules.length} regla(s)`,
    );
  }
}
