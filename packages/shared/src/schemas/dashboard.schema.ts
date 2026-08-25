import { z } from "zod";
import { cashflowProjectionResponseSchema } from "./cashflow.schema";

export const dashboardAccountBalanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
});
export type DashboardAccountBalance = z.infer<typeof dashboardAccountBalanceSchema>;

export const dashboardSummaryResponseSchema = z.object({
  totalBalance: z.number(),
  accounts: z.array(dashboardAccountBalanceSchema),
  projection: cashflowProjectionResponseSchema,
});
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
