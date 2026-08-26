import { z } from 'zod';
import { TransactionSource, TransactionType } from '@prisma/client';
import type { TransactionsService } from '../../transactions/transactions.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  date: z.string().date().describe('YYYY-MM-DD'),
  accountName: z.string().min(1).describe('Nombre (o id) de la cuenta'),
  categoryName: z.string().min(1).describe('Nombre (o id) de la categoría'),
  description: z.string().max(280).optional(),
  clientRequestId: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Generá uno por operación y reenvialo si reintentás, para no duplicar el movimiento',
    ),
};

export function recordTransactionTool(deps: {
  transactionsService: TransactionsService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'record_transaction',
    requiredScope: 'finances:write',
    config: {
      title: 'Registrar transacción',
      description:
        'Registra un ingreso o un gasto. La cuenta y la categoría se indican por nombre (o id); si el nombre es ambiguo o no existe, la tool devuelve las opciones válidas en vez de adivinar. La categoría debe ser del mismo tipo (ingreso/gasto) que la transacción.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const type = args.type as TransactionType;
      const amount = args.amount as number;

      const policy = await deps.policyService.getPolicy(ctx.userId);
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

      const { transaction, alreadyExisted } =
        await deps.transactionsService.create(
          ctx.userId,
          {
            type,
            amount,
            date: new Date(args.date as string),
            accountId: account.id,
            categoryId: category.id,
            description: args.description as string | undefined,
            clientRequestId: args.clientRequestId as string | undefined,
          },
          TransactionSource.MCP,
        );

      const verb = type === TransactionType.INCOME ? 'Ingreso' : 'Gasto';
      const prefix = alreadyExisted
        ? `Ya habías registrado esto (mismo clientRequestId) — no se duplicó. `
        : '';
      return entityResult(
        `${prefix}${verb} de ${amount.toFixed(2)} en "${category.name}" (${account.name}) registrado.`,
        'transaction',
        transaction.id,
        { transaction, alreadyExisted },
      );
    },
  };
}
