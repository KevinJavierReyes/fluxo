import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import type { TransactionsService } from '../../transactions/transactions.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'El id exacto de la transacción — usa search_transactions para encontrarlo',
    ),
  type: z.nativeEnum(TransactionType).optional(),
  amount: z.number().positive().optional(),
  date: z.string().date().optional().describe('YYYY-MM-DD'),
  accountName: z.string().min(1).optional(),
  categoryName: z.string().min(1).optional(),
  description: z.string().max(280).optional(),
};

export function updateTransactionTool(deps: {
  transactionsService: TransactionsService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'update_transaction',
    requiredScope: 'finances:write',
    config: {
      title: 'Editar transacción',
      description:
        'Edita una transacción existente por su id. Solo hace falta indicar los campos que cambian. Si cambia el tipo o la categoría, se revalida que sigan siendo coherentes entre sí.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      if (args.amount !== undefined) {
        const policy = await deps.policyService.getPolicy(ctx.userId);
        deps.policyService.assertAmountWithinLimit(
          policy,
          args.amount as number,
        );
      }

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
              args.type as TransactionType | undefined,
            ),
            args.categoryName as string,
          ).id
        : undefined;

      const transaction = await deps.transactionsService.update(
        ctx.userId,
        args.id as string,
        {
          type: args.type as TransactionType | undefined,
          amount: args.amount as number | undefined,
          date: args.date ? new Date(args.date as string) : undefined,
          accountId,
          categoryId,
          description: args.description as string | undefined,
        },
      );

      return entityResult(
        `Transacción actualizada.`,
        'transaction',
        transaction.id,
        { transaction },
      );
    },
  };
}
