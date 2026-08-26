import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import type { TransactionsService } from '../../transactions/transactions.service';
import { requireResolved } from '../errors/mcp-error';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';
import { textResult, type ToolDefinition } from './types';

const inputSchema = {
  q: z
    .string()
    .min(1)
    .max(120)
    .optional()
    .describe('Texto libre a buscar en la descripción'),
  from: z
    .string()
    .date()
    .optional()
    .describe('Fecha inicial YYYY-MM-DD, inclusive'),
  to: z
    .string()
    .date()
    .optional()
    .describe('Fecha final YYYY-MM-DD, inclusive'),
  type: z.nativeEnum(TransactionType).optional(),
  accountName: z.string().optional().describe('Nombre (o id) de la cuenta'),
  categoryName: z.string().optional().describe('Nombre (o id) de la categoría'),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z
    .string()
    .optional()
    .describe('Cursor de la página anterior, si la hay'),
};

export function searchTransactionsTool(deps: {
  transactionsService: TransactionsService;
  accountResolver: AccountResolver;
  categoryResolver: CategoryResolver;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'search_transactions',
    requiredScope: 'finances:read',
    config: {
      title: 'Buscar transacciones',
      description:
        'Busca transacciones por texto, rango de fechas, tipo, cuenta o categoría. Devuelve una página de resultados (paginada por cursor) y los totales de ingreso/egreso de esa página.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
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

      const page = await deps.transactionsService.findAll(ctx.userId, {
        q: args.q as string | undefined,
        from: args.from ? new Date(args.from as string) : undefined,
        to: args.to ? new Date(args.to as string) : undefined,
        type: args.type as TransactionType | undefined,
        accountId,
        categoryId,
        limit: (args.limit as number) ?? 20,
        cursor: args.cursor as string | undefined,
      });

      const sumIncome = page.items
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const sumExpense = page.items
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const summary =
        page.items.length === 0
          ? 'No se encontraron transacciones con esos filtros.'
          : `${page.items.length} transacción(es)${page.hasMore ? ' en esta página' : ''}. Ingresos: ${sumIncome.toFixed(2)}, Egresos: ${sumExpense.toFixed(2)}.` +
            (page.hasMore
              ? ' Hay más resultados sin traer — estos ingresos/egresos son solo de esta página, no el total real. Usa el cursor para la siguiente página, o get_dashboard para un total exacto del rango.'
              : '');

      return textResult(summary, {
        items: page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        sumIncome,
        sumExpense,
      });
    },
  };
}
