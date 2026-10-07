import { z } from 'zod';
import { TransactionStatus } from '@prisma/client';
import type { TransactionsService } from '../../transactions/transactions.service';
import { addDays, todayForUser } from '../../../common/date.util';
import { textResult, type ToolDefinition } from './types';

const MAX_LISTED_BILLS = 40;
const MAX_FETCHED_PENDING = 200;

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
  transactionsService: TransactionsService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'get_upcoming_bills',
    requiredScope: 'finances:read',
    config: {
      title: 'Ver próximos vencimientos',
      description:
        'Lista las transacciones proyectadas (status PENDING) hasta el horizonte indicado (default 14 días), ordenadas por fecha, incluidas las vencidas que aún no se confirmaron. Cada una trae su `id`: úsalo con update_transaction (status=CONFIRMED, o SKIPPED si no se hizo) para confirmarla.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const days = (args.days as number) ?? 14;
      const today = todayForUser(ctx.timezone);
      const horizon = addDays(today, days);

      const page = await deps.transactionsService.findAll(ctx.userId, {
        status: [TransactionStatus.PENDING],
        to: horizon,
        limit: MAX_FETCHED_PENDING,
      });

      const bills = page.items
        .map((t) => ({
          id: t.id,
          date: t.date,
          name: t.recurringRule?.name ?? t.description ?? t.category.name,
          amount: Number(t.amount),
          type: t.type,
          accountName: t.account.name,
          categoryName: t.category.name,
          recurringRuleId: t.recurringRuleId,
          overdue: t.date.getTime() < today.getTime(),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (bills.length === 0) {
        return textResult(
          `No hay vencimientos proyectados en los próximos ${days} día(s).`,
          { bills: [] },
        );
      }

      const summary =
        `${bills.length} vencimiento(s) pendiente(s) hasta dentro de ${days} día(s):\n` +
        bills
          .slice(0, MAX_LISTED_BILLS)
          .map((b) => {
            const sign = b.type === 'INCOME' ? '+' : '-';
            const flag = b.overdue ? ' [VENCIDA]' : '';
            return `${b.date.toISOString().slice(0, 10)}: ${b.name} ${sign}${b.amount.toFixed(2)} · ${b.categoryName} (${b.accountName}) id=${b.id}${flag}`;
          })
          .join('\n') +
        (bills.length > MAX_LISTED_BILLS
          ? `\n... y ${bills.length - MAX_LISTED_BILLS} más (recortado en la respuesta, acortá el horizonte para verlos todos).`
          : '') +
        (page.hasMore
          ? '\nHay más pendientes sin traer; confirma o salta las vencidas para ver el resto.'
          : '');

      return textResult(summary, { bills });
    },
  };
}
