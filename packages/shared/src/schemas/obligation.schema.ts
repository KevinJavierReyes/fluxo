import { z } from "zod";

export const createObligationSchema = z.object({
  creditorName: z.string().min(1).max(120),
  totalAmount: z.coerce.number().nonnegative(),
  monthlyPayment: z.coerce.number().nonnegative(),
  remainingMonths: z.coerce.number().int().nonnegative().optional(),
  interestRate: z.coerce.number().nonnegative().optional(),
  description: z.string().max(500).optional(),
});
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const updateObligationSchema = createObligationSchema.partial().extend({
  isPaidOff: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

export const linkObligationRecurringSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  byMonthDay: z.coerce.number().int().min(1).max(31),
  startDate: z.coerce.date(),
});
export type LinkObligationRecurringInput = z.infer<typeof linkObligationRecurringSchema>;

export const obligationResponseSchema = z.object({
  id: z.string(),
  creditorName: z.string(),
  totalAmount: z.number(),
  monthlyPayment: z.number(),
  remainingMonths: z.number().nullable(),
  interestRate: z.number().nullable(),
  description: z.string().nullable(),
  isPaidOff: z.boolean(),
  linkedRecurringRuleId: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ObligationResponse = z.infer<typeof obligationResponseSchema>;
