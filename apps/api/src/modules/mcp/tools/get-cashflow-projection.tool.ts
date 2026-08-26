import { z } from 'zod';
import type { CashflowService } from '../../cashflow/cashflow.service';
import { addDays, todayForUser } from '../../../common/date.util';
import { requireResolved } from '../errors/mcp-error';
import type { AccountResolver } from '../resolvers/account.resolver';
import { textResult, type ToolDefinition } from './types';

const inputSchema = {
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(90)
    .describe('Horizonte de la proyección, en días hacia adelante'),
  accountName: z
    .string()
    .optional()
    .describe(
      'Nombre (o id) de una cuenta específica; si se omite, incluye todas.',
    ),
};

export function getCashflowProjectionTool(deps: {
  cashflowService: CashflowService;
  accountResolver: AccountResolver;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'get_cashflow_projection',
    requiredScope: 'finances:read',
    config: {
      title: 'Proyectar flujo de caja',
      description:
        'Proyecta el saldo día a día hacia adelante a partir de los movimientos ya registrados (recurrentes incluidos) y marca los días en que el saldo caería en negativo.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const accountId = args.accountName
        ? requireResolved(
            await deps.accountResolver.resolve(
              ctx.userId,
              args.accountName as string,
            ),
            args.accountName as string,
          ).id
        : undefined;

      const today = todayForUser(ctx.timezone);
      const days = (args.days as number) ?? 90;
      const projection = await deps.cashflowService.getProjection(ctx.userId, {
        from: today,
        to: addDays(today, days),
        accountId,
      });

      const summary =
        projection.negativeDays.length > 0
          ? `Saldo inicial ${projection.startingBalance.toFixed(2)}. El saldo caería en negativo ${projection.negativeDays.length} día(s), el primero el ${projection.negativeDays[0].toISOString().slice(0, 10)}.`
          : `Saldo inicial ${projection.startingBalance.toFixed(2)}. No se proyectan días en negativo en los próximos ${days} días.`;

      return textResult(
        summary,
        projection as unknown as Record<string, unknown>,
      );
    },
  };
}
