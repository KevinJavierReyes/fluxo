import { z } from "zod";
import { cashflowProjectionResponseSchema } from "./cashflow.schema";

export const OverviewGranularity = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
} as const;
export type OverviewGranularity =
  (typeof OverviewGranularity)[keyof typeof OverviewGranularity];

export const overviewQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  granularity: z
    .enum([OverviewGranularity.DAY, OverviewGranularity.WEEK, OverviewGranularity.MONTH])
    .default(OverviewGranularity.DAY),
  accountId: z.string().min(1).optional(),
  /** CSV de ids de grupo de categoría: `?categoryGroupIds=a,b,c` */
  categoryGroupIds: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined,
    ),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});
export type OverviewQuery = z.infer<typeof overviewQuerySchema>;

export const overviewWalletSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.number(),
});
export type OverviewWallet = z.infer<typeof overviewWalletSchema>;

export const overviewBalanceBucketSchema = z.object({
  bucket: z.coerce.date(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  isNegative: z.boolean(),
  isFuture: z.boolean(),
});
export type OverviewBalanceBucket = z.infer<typeof overviewBalanceBucketSchema>;

export const overviewChangesBucketSchema = z.object({
  bucket: z.coerce.date(),
  income: z.number(),
  expense: z.number(),
  net: z.number(),
  isFuture: z.boolean(),
});
export type OverviewChangesBucket = z.infer<typeof overviewChangesBucketSchema>;

export const overviewGroupBreakdownSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  amount: z.number(),
  transactionCount: z.number(),
  percentage: z.number(),
});
export type OverviewGroupBreakdown = z.infer<typeof overviewGroupBreakdownSchema>;

export const overviewResponseSchema = z.object({
  today: z.coerce.date(),
  hasFuture: z.boolean(),
  granularity: z.enum([
    OverviewGranularity.DAY,
    OverviewGranularity.WEEK,
    OverviewGranularity.MONTH,
  ]),
  totalBalance: z.number(),
  wallets: z.array(overviewWalletSchema),
  totals: z.object({
    endingBalance: z.number(),
    periodChange: z.number(),
    periodIncome: z.number(),
    periodExpenses: z.number(),
    transactionCount: z.number(),
  }),
  balanceSeries: z.array(overviewBalanceBucketSchema),
  changesSeries: z.array(overviewChangesBucketSchema),
  incomeByGroup: z.array(overviewGroupBreakdownSchema),
  expenseByGroup: z.array(overviewGroupBreakdownSchema),
  amountRange: z.object({ min: z.number(), max: z.number() }),
  projection: cashflowProjectionResponseSchema,
});
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
