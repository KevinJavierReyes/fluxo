import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { textResult, type ToolDefinition } from './types';
import {
  recordOneTransaction,
  type RecordTransactionDeps,
} from './record-transaction.tool';

const MAX_BATCH_ITEMS = 30;

const itemSchema = z.object({
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
      'Generá uno por ítem y reenvialo si reintentás el batch entero, para no duplicar movimientos ya cargados.',
    ),
});

const inputSchema = {
  items: z
    .array(itemSchema)
    .min(1)
    .max(MAX_BATCH_ITEMS)
    .describe(
      `Hasta ${MAX_BATCH_ITEMS} transacciones a registrar en una sola llamada.`,
    ),
};

export function recordTransactionsBatchTool(
  deps: RecordTransactionDeps,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'record_transactions_batch',
    requiredScope: 'finances:write',
    config: {
      title: 'Registrar varias transacciones de una vez',
      description: `Registra hasta ${MAX_BATCH_ITEMS} ingresos/gastos en una sola llamada — ideal cuando el usuario pega una lista de movimientos (ej. un resumen de tarjeta) en vez de dictarlos uno por uno. Cada ítem se procesa por separado: si uno falla (cuenta ambigua, categoría inexistente, límite superado), los demás se registran igual — la respuesta detalla cuáles se cargaron y cuáles no, y por qué.`,
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const items = args.items as z.infer<typeof itemSchema>[];
      const policy = await deps.policyService.getPolicy(ctx.userId);

      const results = await Promise.all(
        items.map(async (item, index) => {
          try {
            const { transaction, alreadyExisted, account, category } =
              await recordOneTransaction(deps, ctx.userId, policy, item);
            return {
              index,
              ok: true as const,
              transactionId: transaction.id,
              alreadyExisted,
              accountName: account.name,
              categoryName: category.name,
            };
          } catch (error) {
            return {
              index,
              ok: false as const,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }),
      );

      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      const summary =
        `${succeeded.length} de ${items.length} transacción(es) registrada(s)${failed.length > 0 ? `, ${failed.length} fallaron` : ''}.\n` +
        results
          .map((r) => {
            const item = items[r.index];
            const verb =
              item.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto';
            return r.ok
              ? `[OK] ${verb} ${item.amount.toFixed(2)} · ${r.categoryName} (${r.accountName})${r.alreadyExisted ? ' — ya existía, no se duplicó' : ''}`
              : `[FALLÓ] ${verb} ${item.amount.toFixed(2)} (${item.accountName}/${item.categoryName}): ${r.error}`;
          })
          .join('\n');

      return textResult(summary, { results });
    },
  };
}
