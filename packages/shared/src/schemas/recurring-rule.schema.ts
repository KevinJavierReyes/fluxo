import { z } from "zod";
import { RecurrenceFrequency, TransactionType } from "../enums";

export const createRecurringRuleSchema = z
  .object({
    name: z.string().min(1).max(80),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    type: z.nativeEnum(TransactionType),
    amount: z.coerce.number().positive(),
    description: z.string().max(280).optional(),
    frequency: z.nativeEnum(RecurrenceFrequency),
    interval: z.coerce.number().int().positive().default(1),
    byMonthDay: z.coerce.number().int().min(1).max(31).optional(),
    byWeekday: z.coerce.number().int().min(0).max(6).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .refine((v) => v.frequency !== RecurrenceFrequency.MONTHLY || v.byMonthDay !== undefined, {
    message: "byMonthDay es requerido para frecuencia MONTHLY",
    path: ["byMonthDay"],
  })
  .refine((v) => v.frequency !== RecurrenceFrequency.WEEKLY || v.byWeekday !== undefined, {
    message: "byWeekday es requerido para frecuencia WEEKLY",
    path: ["byWeekday"],
  });
export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;

export const updateRecurringRuleSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().max(280).optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;

export const recurringRuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string(),
  categoryId: z.string(),
  type: z.nativeEnum(TransactionType),
  amount: z.number(),
  description: z.string().nullable(),
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.number(),
  byMonthDay: z.number().nullable(),
  byWeekday: z.number().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  isActive: z.boolean(),
  lastGeneratedUntil: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RecurringRuleResponse = z.infer<typeof recurringRuleResponseSchema>;
