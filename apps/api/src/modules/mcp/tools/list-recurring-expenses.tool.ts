import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { textResult, type ToolDefinition } from './types';

export function listRecurringExpensesTool(deps: {
  recurringRulesService: RecurringRulesService;
}): ToolDefinition<Record<string, never>> {
  return {
    name: 'list_recurring_expenses',
    requiredScope: 'finances:read',
    config: {
      title: 'Listar gastos e ingresos recurrentes',
      description:
        'Lista todas las reglas recurrentes del usuario (activas y pausadas), con su monto y frecuencia. Para saber las próximas fechas concretas en que van a ejecutarse, usa get_upcoming_bills.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (_args, ctx) => {
      const rules = await deps.recurringRulesService.findAll(ctx.userId);

      if (rules.length === 0) {
        return textResult('No hay reglas recurrentes registradas.', {
          rules,
        });
      }

      const summary =
        `${rules.length} regla(s) recurrente(s):\n` +
        rules
          .map((r) => {
            const status = r.isActive ? '' : ' (pausada)';
            const cadence =
              r.interval > 1
                ? `cada ${r.interval} ${r.frequency.toLowerCase()}`
                : r.frequency.toLowerCase();
            return `${r.name}: ${Number(r.amount).toFixed(2)} · ${r.category.name} (${r.account.name}), ${cadence}${status}`;
          })
          .join('\n');

      return textResult(summary, { rules });
    },
  };
}
