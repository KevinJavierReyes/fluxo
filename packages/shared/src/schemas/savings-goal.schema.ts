import { z } from "zod";

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1).max(80),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.coerce.date().optional(),
});
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;

export const contributeSavingsGoalSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(280).optional(),
  clientRequestId: z.string().min(1).max(100).optional(),
});
export type ContributeSavingsGoalInput = z.infer<typeof contributeSavingsGoalSchema>;

export const savingsGoalResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  targetDate: z.coerce.date().nullable(),
  isArchived: z.boolean(),
  progress: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SavingsGoalResponse = z.infer<typeof savingsGoalResponseSchema>;
