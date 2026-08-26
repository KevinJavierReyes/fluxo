import { z } from 'zod';
import type { DashboardService } from '../../dashboard/dashboard.service';
import { requireResolved } from '../errors/mcp-error';
import type { AccountResolver } from '../resolvers/account.resolver';
import { textResult, type ToolDefinition } from './types';

const MAX_SERIES_POINTS = 60;

const inputSchema = {
  from: z
    .string()
    .date()
    .optional()
    .describe(
      'Fecha inicial YYYY-MM-DD. Si se omite junto con "to", devuelve el resumen general (saldos + proyección a 90 días).',
    ),
  to: z.string().date().optional().describe('Fecha final YYYY-MM-DD.'),
  granularity: z
    .enum(['day', 'week', 'month'])
    .optional()
    .describe('Se elige automáticamente según el rango si no se indica.'),
  accountName: z
    .string()
    .optional()
    .describe(
      'Nombre (o id) de una cuenta específica; si se omite, incluye todas.',
    ),
};

function pickGranularity(from: Date, to: Date): 'day' | 'week' | 'month' {
  const days = Math.abs(to.getTime() - from.getTime()) / 86_400_000;
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function truncateSeries<T>(series: T[]): { series: T[]; truncated: boolean } {
  if (series.length <= MAX_SERIES_POINTS) {
    return { series, truncated: false };
  }
  return { series: series.slice(-MAX_SERIES_POINTS), truncated: true };
}

export function getDashboardTool(deps: {
  dashboardService: DashboardService;
  accountResolver: AccountResolver;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'get_dashboard',
    requiredScope: 'finances:read',
    config: {
      title: 'Ver panel financiero',
      description:
        'Resumen financiero: saldos por cuenta, proyección de flujo de caja, y desglose por categoría. Sin fechas, da el estado general. Con "from"/"to", da el detalle del rango: KPIs del periodo, serie de saldo, e ingresos/egresos por grupo de categoría.',
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

      if (!args.from || !args.to) {
        const summary = await deps.dashboardService.getSummary(
          ctx.userId,
          ctx.timezone,
        );
        return textResult(
          `Saldo total: ${summary.totalBalance.toFixed(2)}. ${summary.accounts.length} cuenta(s).`,
          summary,
        );
      }

      const from = new Date(args.from as string);
      const to = new Date(args.to as string);
      const granularity =
        (args.granularity as 'day' | 'week' | 'month' | undefined) ??
        pickGranularity(from, to);

      const overview = await deps.dashboardService.getOverview(
        ctx.userId,
        { from, to, granularity, accountId },
        ctx.timezone,
      );

      const { series: balanceSeries, truncated: balanceTruncated } =
        truncateSeries(overview.balanceSeries);
      const { series: changesSeries, truncated: changesTruncated } =
        truncateSeries(overview.changesSeries);

      const note =
        balanceTruncated || changesTruncated
          ? ' (la serie se recortó a los últimos puntos por tamaño; pedí un rango más corto para verla completa)'
          : '';

      return textResult(
        `Del ${args.from as string} al ${args.to as string}: ingresos ${overview.totals.periodIncome.toFixed(2)}, egresos ${overview.totals.periodExpenses.toFixed(2)}, cambio neto ${overview.totals.periodChange.toFixed(2)}.${note}`,
        { ...overview, balanceSeries, changesSeries },
      );
    },
  };
}
