import { z } from "zod";
import { cashflowProjectionResponseSchema } from "./cashflow.schema";

export const dashboardAccountBalanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
});
export type DashboardAccountBalance = z.infer<typeof dashboardAccountBalanceSchema>;

export const dashboardCategoryBreakdownSchema = z.object({
  name: z.string(),
  amount: z.number(),
});
export type DashboardCategoryBreakdown = z.infer<typeof dashboardCategoryBreakdownSchema>;

export const dashboardSummaryResponseSchema = z.object({
  totalBalance: z.number(),
  accounts: z.array(dashboardAccountBalanceSchema),
  projection: cashflowProjectionResponseSchema,
  categoryBreakdown: z.array(dashboardCategoryBreakdownSchema),
});
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
