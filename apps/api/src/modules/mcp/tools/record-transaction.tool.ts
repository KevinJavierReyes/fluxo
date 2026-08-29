import { z } from 'zod';
import { TransactionSource, TransactionType } from '@prisma/client';
import type { TransactionsService } from '../../transactions/transactions.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicy, McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { entityResult, type ToolDefinition } from './types';

export interface RecordTransactionDeps {
  transactionsService: TransactionsService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
  policyService: McpPolicyService;
}

export interface RecordTransactionItemInput {
  type: TransactionType;
  amount: number;
  date: string;
  accountName: string;
  categoryName: string;
  description?: string;
  clientRequestId?: string;
}

/**
 * Lógica compartida entre record_transaction (un ítem) y
 * record_transactions_batch (N ítems) — resuelve cuenta/categoría por
 * nombre, valida el límite de monto contra una policy ya obtenida (para que
 * el batch la pida una sola vez, no una vez por ítem) y crea la transacción.
 */
export async function recordOneTransaction(
  deps: RecordTransactionDeps,
  userId: string,
  policy: McpPolicy,
  item: RecordTransactionItemInput,
): Promise<{
  transaction: Awaited<
    ReturnType<TransactionsService['create']>
  >['transaction'];
  alreadyExisted: boolean;
  account: { id: string; name: string };
  category: { id: string; name: string };
}> {
  deps.policyService.assertAmountWithinLimit(policy, item.amount);

  const account = requireResolved(
    await deps.accountResolver.resolve(userId, item.accountName),
    item.accountName,
  );
  const category = requireResolved(
    await deps.categoryResolver.resolve(userId, item.categoryName, item.type),
    item.categoryName,
  );

  const { transaction, alreadyExisted } = await deps.transactionsService.create(
    userId,
    {
      type: item.type,
      amount: item.amount,
      date: new Date(item.date),
      accountId: account.id,
      categoryId: category.id,
      description: item.description,
      clientRequestId: item.clientRequestId,
    },
    TransactionSource.MCP,
  );

  return { transaction, alreadyExisted, account, category };
}

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

export function recordTransactionTool(
  deps: RecordTransactionDeps,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'record_transaction',
    requiredScope: 'finances:write',
    config: {
      title: 'Registrar transacción',
      description:
        'Registra un ingreso o un gasto (no un movimiento entre cuentas propias — para eso usa transfer_between_accounts). La cuenta y la categoría se indican por nombre (o id); si el nombre es ambiguo o no existe, la tool devuelve las opciones válidas en vez de adivinar. La categoría debe ser del mismo tipo (ingreso/gasto) que la transacción. Para cargar varios de una — ej. pegando un resumen de tarjeta — usa record_transactions_batch en vez de llamar esto N veces.',
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
      const { transaction, alreadyExisted, account, category } =
        await recordOneTransaction(deps, ctx.userId, policy, {
          type,
          amount,
          date: args.date as string,
          accountName: args.accountName as string,
          categoryName: args.categoryName as string,
          description: args.description as string | undefined,
          clientRequestId: args.clientRequestId as string | undefined,
        });

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
