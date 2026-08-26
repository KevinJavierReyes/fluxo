import { z } from 'zod';
import type { SavingsGoalsService } from '../../savings-goals/savings-goals.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import { resolveByName } from '../resolvers/resolve-result';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  goalName: z.string().min(1).describe('Nombre (o id) de la meta de ahorro'),
  accountName: z.string().min(1).describe('Cuenta desde la que sale el aporte'),
  amount: z.number().positive(),
  date: z.string().date().describe('YYYY-MM-DD'),
  categoryName: z
    .string()
    .min(1)
    .optional()
    .describe('Si se omite, usa la categoría de gasto "Ahorro" del usuario'),
  description: z.string().max(280).optional(),
  clientRequestId: z.string().min(1).max(100).optional(),
};

export function contributeToSavingsGoalTool(deps: {
  savingsGoalsService: SavingsGoalsService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'contribute_to_savings_goal',
    requiredScope: 'finances:write',
    config: {
      title: 'Aportar a una meta de ahorro',
      description:
        'Registra un aporte a una meta de ahorro como un gasto (sale de una cuenta hacia el ahorro) y devuelve el progreso actualizado de la meta.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const amount = args.amount as number;
      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertAmountWithinLimit(policy, amount);

      const goals = await deps.savingsGoalsService.findAll(ctx.userId);
      const goal = requireResolved(
        resolveByName(
          args.goalName as string,
          goals,
          (g) => g.name,
          (g) => g.id,
        ),
        args.goalName as string,
      );

      const account = requireResolved(
        await deps.accountResolver.resolve(
          ctx.userId,
          args.accountName as string,
        ),
        args.accountName as string,
      );
      const categoryId = args.categoryName
        ? requireResolved(
            await deps.categoryResolver.resolve(
              ctx.userId,
              args.categoryName as string,
              'EXPENSE',
            ),
            args.categoryName as string,
          ).id
        : undefined;

      const {
        goal: updatedGoal,
        transactionId,
        alreadyExisted,
      } = await deps.savingsGoalsService.contribute(ctx.userId, goal.id, {
        accountId: account.id,
        categoryId,
        amount,
        date: new Date(args.date as string),
        description: args.description as string | undefined,
        clientRequestId: args.clientRequestId as string | undefined,
      });

      const prefix = alreadyExisted
        ? `Ya habías registrado este aporte (mismo clientRequestId) — no se duplicó. `
        : '';
      // entityType/entityId apuntan a la transacción (lo que fluxo_undo
      // puede deshacer de verdad), no a la meta — la meta ya existía antes
      // de esta llamada, lo único que se creó fue el aporte.
      return entityResult(
        `${prefix}Aporte de ${amount.toFixed(2)} a "${goal.name}" registrado. Progreso: ${Number(updatedGoal.progress).toFixed(2)}.`,
        'transaction',
        transactionId,
        { goal: updatedGoal, alreadyExisted },
      );
    },
  };
}
