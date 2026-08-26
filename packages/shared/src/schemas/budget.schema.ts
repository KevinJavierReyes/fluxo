import { z } from "zod";

export const createBudgetSchema = z.object({
  categoryGroupId: z.string().min(1),
  amount: z.coerce.number().positive(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  effectiveTo: z.coerce.date().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const budgetResponseSchema = z.object({
  id: z.string(),
  categoryGroupId: z.string(),
  amount: z.number(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable(),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BudgetResponse = z.infer<typeof budgetResponseSchema>;

export const budgetStatusQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato esperado: YYYY-MM")
    .optional(),
});
export type BudgetStatusQuery = z.infer<typeof budgetStatusQuerySchema>;

export const budgetStatusResponseSchema = z.object({
  categoryGroupId: z.string(),
  categoryGroupName: z.string(),
  budgetAmount: z.number(),
  spentAmount: z.number(),
  remainingAmount: z.number(),
  percentUsed: z.number(),
  isOverBudget: z.boolean(),
});
export type BudgetStatusResponse = z.infer<typeof budgetStatusResponseSchema>;
