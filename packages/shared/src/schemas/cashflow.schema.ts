import { z } from "zod";

export const cashflowProjectionQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  accountId: z.string().min(1).optional(),
  /** CSV de ids de cuenta: `?accountIds=a,b,c` (alternativa multi a `accountId`). */
  accountIds: z
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
});
export type CashflowProjectionQuery = z.infer<typeof cashflowProjectionQuerySchema>;

export const cashflowDayPointSchema = z.object({
  date: z.coerce.date(),
  income: z.number(),
  expense: z.number(),
  /** Saldo proyectado (CONFIRMED + PENDING) al inicio del día. */
  openingBalance: z.number(),
  /** Saldo proyectado (CONFIRMED + PENDING) al cierre del día. */
  closingBalance: z.number(),
  /** Saldo real (solo CONFIRMED) al inicio del día; null si el día es futuro. */
  realOpeningBalance: z.number().nullable(),
  /** Saldo real (solo CONFIRMED) al cierre del día; null si el día es futuro. */
  realClosingBalance: z.number().nullable(),
  /** Hay PENDING que afectan al saldo proyectado de este día. */
  hasPending: z.boolean(),
  isNegative: z.boolean(),
});
export type CashflowDayPoint = z.infer<typeof cashflowDayPointSchema>;

export const cashflowProjectionResponseSchema = z.object({
  /** Saldo proyectado al inicio del rango. */
  startingBalance: z.number(),
  /** Saldo real al inicio del rango. */
  realStartingBalance: z.number(),
  points: z.array(cashflowDayPointSchema),
  negativeDays: z.array(z.coerce.date()),
});
export type CashflowProjectionResponse = z.infer<typeof cashflowProjectionResponseSchema>;
