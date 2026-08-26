import { z } from 'zod';
import type { ExpenseTemplatesService } from '../../expense-templates/expense-templates.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import { resolveByName } from '../resolvers/resolve-result';
import type { AccountResolver } from '../resolvers/account.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  templateName: z
    .string()
    .min(1)
    .describe('Nombre (o id) de la plantilla de gasto'),
  date: z.string().date().describe('YYYY-MM-DD'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('Si se omite, usa el monto sugerido de la plantilla'),
  accountName: z
    .string()
    .min(1)
    .optional()
    .describe('Si se omite, usa la cuenta por defecto de la plantilla'),
  description: z.string().max(280).optional(),
  clientRequestId: z.string().min(1).max(100).optional(),
};

export function applyExpenseTemplateTool(deps: {
  expenseTemplatesService: ExpenseTemplatesService;
  accountResolver: AccountResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'apply_expense_template',
    requiredScope: 'finances:write',
    config: {
      title: 'Aplicar plantilla de gasto',
      description:
        'Registra una transacción a partir de una plantilla de gasto frecuente (ej. "Alquiler", "Internet"). Usa el monto y la cuenta de la plantilla salvo que se indiquen distintos.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const templates = await deps.expenseTemplatesService.findAll(ctx.userId);
      const template = requireResolved(
        resolveByName(
          args.templateName as string,
          templates,
          (t) => t.name,
          (t) => t.id,
        ),
        args.templateName as string,
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

      const amount =
        (args.amount as number | undefined) ??
        Number(template.suggestedAmount ?? 0);
      if (amount > 0) {
        const policy = await deps.policyService.getPolicy(ctx.userId);
        deps.policyService.assertAmountWithinLimit(policy, amount);
      }

      const { transaction, alreadyExisted } =
        await deps.expenseTemplatesService.apply(ctx.userId, template.id, {
          date: new Date(args.date as string),
          amount: args.amount as number | undefined,
          accountId,
          description: args.description as string | undefined,
          clientRequestId: args.clientRequestId as string | undefined,
        });

      const prefix = alreadyExisted
        ? `Ya habías aplicado esto (mismo clientRequestId) — no se duplicó. `
        : '';
      return entityResult(
        `${prefix}Plantilla "${template.name}" aplicada: ${Number(transaction.amount).toFixed(2)}.`,
        'transaction',
        transaction.id,
        { transaction, alreadyExisted },
      );
    },
  };
}
