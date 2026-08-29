import { z } from 'zod';
import { createRecurringRuleSchema } from '@fluxo/shared';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  name: z
    .string()
    .min(1)
    .max(80)
    .describe('Nombre de la regla, ej. "Alquiler"'),
  amount: z.number().positive(),
  accountName: z.string().min(1).describe('Nombre (o id) de la cuenta'),
  categoryName: z.string().min(1).describe('Nombre (o id) de la categoría'),
  type: z.nativeEnum(TransactionType),
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      'Cada cuántas unidades de frequency se repite (ej. interval:2 + frequency:WEEKLY = cada 2 semanas).',
    ),
  startDate: z
    .string()
    .date()
    .describe('YYYY-MM-DD, primera fecha en que aplica'),
  dayOfMonth: z
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .describe(
      'Requerido si frequency es MONTHLY. Día del mes (1-31); se ajusta al último día si el mes es más corto (ej. 31 en febrero -> 28/29).',
    ),
  weekday: z
    .number()
    .int()
    .min(0)
    .max(6)
    .optional()
    .describe('Requerido si frequency es WEEKLY. 0=domingo … 6=sábado.'),
  endDate: z
    .string()
    .date()
    .optional()
    .describe(
      'YYYY-MM-DD, última fecha en que aplica; si se omite, no tiene fin.',
    ),
  description: z.string().max(280).optional(),
};

export function createRecurringExpenseTool(deps: {
  recurringRulesService: RecurringRulesService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'create_recurring_expense',
    requiredScope: 'config:write',
    config: {
      title: 'Crear un gasto o ingreso recurrente',
      description:
        'Crea una regla recurrente (ej. alquiler, suscripción, sueldo) que genera transacciones automáticamente según la frecuencia indicada. La cuenta y la categoría se indican por nombre (o id). Para cambiar la frecuencia/intervalo/día de una regla existente no se puede editar — hay que borrarla con delete_recurring_expense y crearla de nuevo.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const type = args.type as TransactionType;
      const amount = args.amount as number;

      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertConfigWriteAllowed(policy);
      deps.policyService.assertAmountWithinLimit(policy, amount);

      const account = requireResolved(
        await deps.accountResolver.resolve(
          ctx.userId,
          args.accountName as string,
        ),
        args.accountName as string,
      );
      const category = requireResolved(
        await deps.categoryResolver.resolve(
          ctx.userId,
          args.categoryName as string,
          type,
        ),
        args.categoryName as string,
      );

      const dto = createRecurringRuleSchema.parse({
        name: args.name,
        accountId: account.id,
        categoryId: category.id,
        type,
        amount: args.amount,
        description: args.description as string | undefined,
        frequency: args.frequency,
        interval: args.interval,
        byMonthDay: args.dayOfMonth,
        byWeekday: args.weekday,
        startDate: args.startDate,
        endDate: args.endDate,
      });

      const rule = await deps.recurringRulesService.create(ctx.userId, dto);

      return entityResult(
        `Regla recurrente "${rule.name}" creada: ${Number(rule.amount).toFixed(2)} en "${category.name}" (${account.name}), ${rule.frequency.toLowerCase()}.`,
        'recurring_rule',
        rule.id,
        { rule },
      );
    },
  };
}
