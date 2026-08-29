import { z } from 'zod';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { generateOccurrenceDates } from '../../recurring-rules/occurrence-generator';
import { addDays, todayForUser } from '../../../common/date.util';
import { textResult, type ToolDefinition } from './types';

const MAX_LISTED_BILLS = 40;

const inputSchema = {
  days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(14)
    .describe('Horizonte hacia adelante, en días'),
};

export function getUpcomingBillsTool(deps: {
  recurringRulesService: RecurringRulesService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'get_upcoming_bills',
    requiredScope: 'finances:read',
    config: {
      title: 'Ver próximos vencimientos',
      description:
        'Calcula las próximas ocurrencias de los gastos/ingresos recurrentes activos dentro del horizonte indicado (default 14 días), ordenadas por fecha.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const days = (args.days as number) ?? 14;
      const today = todayForUser(ctx.timezone);
      const horizon = addDays(today, days);

      const rules = await deps.recurringRulesService.findAll(ctx.userId);
      const activeRules = rules.filter((r) => r.isActive);

      const bills = activeRules
        .flatMap((rule) =>
          generateOccurrenceDates(rule, today, horizon).map((date) => ({
            date,
            ruleName: rule.name,
            amount: Number(rule.amount),
            type: rule.type,
            accountName: rule.account.name,
            categoryName: rule.category.name,
          })),
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (bills.length === 0) {
        return textResult(
          `No hay vencimientos proyectados en los próximos ${days} día(s).`,
          { bills: [] },
        );
      }

      const summary =
        `${bills.length} vencimiento(s) en los próximos ${days} día(s):\n` +
        bills
          .slice(0, MAX_LISTED_BILLS)
          .map((b) => {
            const sign = b.type === 'INCOME' ? '+' : '-';
            return `${b.date.toISOString().slice(0, 10)}: ${b.ruleName} ${sign}${b.amount.toFixed(2)} · ${b.categoryName} (${b.accountName})`;
          })
          .join('\n') +
        (bills.length > MAX_LISTED_BILLS
          ? `\n... y ${bills.length - MAX_LISTED_BILLS} más (recortado en la respuesta, acortá el horizonte para verlos todos).`
          : '');

      return textResult(summary, { bills });
    },
  };
}
