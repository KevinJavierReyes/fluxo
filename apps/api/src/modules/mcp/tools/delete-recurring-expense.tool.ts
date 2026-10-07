import { z } from 'zod';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import { resolveByName } from '../resolvers/resolve-result';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  ruleName: z
    .string()
    .min(1)
    .describe(
      'Nombre (o id) de la regla recurrente — usa list_recurring_expenses si no lo sabés exacto',
    ),
  confirm: z
    .literal(true)
    .describe(
      'Tiene que ser exactamente `true` — confirmación explícita de que se quiere borrar',
    ),
  deleteConfirmed: z
    .boolean()
    .optional()
    .describe(
      'true = borra también las transacciones ya CONFIRMED generadas por la regla. Por defecto (false) solo se borran las proyectadas (PENDING/SKIPPED) y las confirmadas quedan como movimientos sueltos',
    ),
};

export function deleteRecurringExpenseTool(deps: {
  recurringRulesService: RecurringRulesService;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'delete_recurring_expense',
    requiredScope: 'config:write',
    config: {
      title: 'Eliminar un gasto o ingreso recurrente',
      description:
        'Borra una regla recurrente por nombre (o id). Requiere confirm:true. Borra también sus transacciones proyectadas (PENDING/SKIPPED); las confirmadas se conservan salvo que se pase deleteConfirmed:true.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertConfigWriteAllowed(policy);

      const rules = await deps.recurringRulesService.findAll(ctx.userId);
      const rule = requireResolved(
        resolveByName(
          args.ruleName as string,
          rules,
          (r) => r.name,
          (r) => r.id,
        ),
        args.ruleName as string,
      );

      await deps.recurringRulesService.remove(ctx.userId, rule.id, {
        deleteConfirmed: args.deleteConfirmed === true,
      });

      return entityResult(
        `Regla recurrente "${rule.name}" borrada.`,
        'recurring_rule',
        rule.id,
        { id: rule.id, deleted: true },
      );
    },
  };
}
