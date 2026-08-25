import { z } from "zod";
import { TransactionType } from "../enums";

export const createExpenseTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  suggestedAmount: z.coerce.number().positive().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  type: z.nativeEnum(TransactionType).default(TransactionType.EXPENSE),
});
export type CreateExpenseTemplateInput = z.infer<typeof createExpenseTemplateSchema>;

export const updateExpenseTemplateSchema = createExpenseTemplateSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateExpenseTemplateInput = z.infer<typeof updateExpenseTemplateSchema>;

export const applyExpenseTemplateSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive().optional(),
  accountId: z.string().min(1).optional(),
  description: z.string().max(280).optional(),
});
export type ApplyExpenseTemplateInput = z.infer<typeof applyExpenseTemplateSchema>;

export const expenseTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  suggestedAmount: z.number().nullable(),
  accountId: z.string().nullable(),
  categoryId: z.string(),
  type: z.nativeEnum(TransactionType),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ExpenseTemplateResponse = z.infer<typeof expenseTemplateResponseSchema>;
