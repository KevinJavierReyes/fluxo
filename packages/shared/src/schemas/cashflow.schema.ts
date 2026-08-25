import { z } from "zod";

export const cashflowProjectionQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  accountId: z.string().min(1).optional(),
});
export type CashflowProjectionQuery = z.infer<typeof cashflowProjectionQuerySchema>;

export const cashflowDayPointSchema = z.object({
  date: z.coerce.date(),
  income: z.number(),
  expense: z.number(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  isNegative: z.boolean(),
});
export type CashflowDayPoint = z.infer<typeof cashflowDayPointSchema>;

export const cashflowProjectionResponseSchema = z.object({
  startingBalance: z.number(),
  points: z.array(cashflowDayPointSchema),
  negativeDays: z.array(z.coerce.date()),
});
export type CashflowProjectionResponse = z.infer<typeof cashflowProjectionResponseSchema>;
