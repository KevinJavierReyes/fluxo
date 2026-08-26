import { z } from 'zod';
import type { BudgetsService } from '../../budgets/budgets.service';
import { textResult, type ToolDefinition } from './types';

const inputSchema = {
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Formato esperado: YYYY-MM')
    .optional()
    .describe('Mes a consultar, YYYY-MM. Si se omite, usa el mes actual.'),
};

export function getBudgetStatusTool(deps: {
  budgetsService: BudgetsService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'get_budget_status',
    requiredScope: 'finances:read',
    config: {
      title: 'Ver estado de presupuestos',
      description:
        'Para cada presupuesto vigente en el mes, cuánto se presupuestó, cuánto se gastó, y si se pasó del límite.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const status = await deps.budgetsService.getStatus(
        ctx.userId,
        { month: args.month as string | undefined },
        ctx.timezone,
      );

      if (status.length === 0) {
        return textResult('No hay presupuestos vigentes para ese mes.', {
          budgets: status,
        });
      }
      const overBudget = status.filter((b) => b.isOverBudget);
      const summary =
        overBudget.length > 0
          ? `${status.length} presupuesto(s). Sobre el límite: ${overBudget.map((b) => b.categoryGroupName).join(', ')}.`
          : `${status.length} presupuesto(s), todos dentro del límite.`;

      return textResult(summary, { budgets: status });
    },
  };
}
