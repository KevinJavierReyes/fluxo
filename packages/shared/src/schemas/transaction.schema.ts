import { z } from "zod";
import { TransactionSource, TransactionType } from "../enums";

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  type: z.nativeEnum(TransactionType),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(280).optional(),
  savingsGoalId: z.string().min(1).optional(),
  /**
   * Identificador de idempotencia que genera el cliente (típicamente un
   * agente MCP): si reenvía la misma transacción con el mismo id, un
   * unique constraint evita duplicarla en vez de crear una segunda.
   */
  clientRequestId: z.string().min(1).max(100).optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionResponseSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  categoryId: z.string(),
  type: z.nativeEnum(TransactionType),
  amount: z.number(),
  date: z.coerce.date(),
  description: z.string().nullable(),
  source: z.nativeEnum(TransactionSource),
  isModified: z.boolean(),
  recurringRuleId: z.string().nullable(),
  expenseTemplateId: z.string().nullable(),
  savingsGoalId: z.string().nullable(),
  clientRequestId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;

export const listTransactionsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  /** Búsqueda de texto libre sobre la descripción. */
  q: z.string().min(1).max(120).optional(),
  /** Cursor de paginación: el id de la última fila de la página anterior. */
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export const paginatedTransactionsResponseSchema = z.object({
  items: z.array(transactionResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PaginatedTransactionsResponse = z.infer<
  typeof paginatedTransactionsResponseSchema
>;
