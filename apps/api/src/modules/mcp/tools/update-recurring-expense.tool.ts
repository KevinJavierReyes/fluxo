import { z } from 'zod';
import { updateRecurringRuleSchema } from '@fluxo/shared';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import { resolveByName } from '../resolvers/resolve-result';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  ruleName: z
    .string()
    .min(1)
    .describe(
      'Nombre (o id) de la regla recurrente — usa list_recurring_expenses si no lo sabés exacto',
    ),
  name: z.string().min(1).max(80).optional(),
  amount: z.number().positive().optional(),
  accountName: z.string().min(1).optional(),
  categoryName: z.string().min(1).optional(),
  description: z.string().max(280).optional(),
  endDate: z
    .string()
    .date()
    .optional()
    .describe('YYYY-MM-DD, nueva fecha de fin de la regla'),
  isActive: z
    .boolean()
    .optional()
    .describe('false para pausar la regla sin borrarla, true para reactivarla'),
};

export function updateRecurringExpenseTool(deps: {
  recurringRulesService: RecurringRulesService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'update_recurring_expense',
    requiredScope: 'config:write',
    config: {
      title: 'Editar un gasto o ingreso recurrente',
      description:
        'Edita nombre, monto, cuenta, categoría, descripción, fecha de fin o estado (activo/pausado) de una regla recurrente existente. No se puede cambiar la frecuencia, el intervalo, el día del mes/semana ni la fecha de inicio — para eso hay que borrar la regla con delete_recurring_expense y crear una nueva con create_recurring_expense.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertConfigWriteAllowed(policy);
      if (args.amount !== undefined) {
        deps.policyService.assertAmountWithinLimit(
          policy,
          args.amount as number,
        );
      }

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

      const accountId = args.accountName
        ? requireResolved(
            await deps.accountResolver.resolve(
              ctx.userId,
              args.accountName as string,
            ),
            args.accountName as string,
          ).id
        : undefined;
      const categoryId = args.categoryName
        ? requireResolved(
            await deps.categoryResolver.resolve(
              ctx.userId,
              args.categoryName as string,
              rule.type,
            ),
            args.categoryName as string,
          ).id
        : undefined;

      const dto = updateRecurringRuleSchema.parse({
        name: args.name,
        amount: args.amount,
        accountId,
        categoryId,
        description: args.description as string | undefined,
        endDate: args.endDate,
        isActive: args.isActive,
      });

      const updated = await deps.recurringRulesService.update(
        ctx.userId,
        rule.id,
        dto,
      );

      return entityResult(
        `Regla recurrente "${updated.name}" actualizada.`,
        'recurring_rule',
        updated.id,
        { rule: updated },
      );
    },
  };
}
