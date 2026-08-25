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
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
