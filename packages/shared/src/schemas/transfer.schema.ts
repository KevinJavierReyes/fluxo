import { z } from "zod";

export const createTransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(280).optional(),
  /**
   * Identificador de idempotencia que genera el cliente: si reenvía la misma
   * transferencia con el mismo id, un unique constraint evita duplicarla.
   */
  clientRequestId: z.string().min(1).max(100).optional(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const listTransfersQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  /** Transferencias donde la cuenta es origen o destino. */
  accountId: z.string().min(1).optional(),
});
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;

export const transferResponseSchema = z.object({
  id: z.string(),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  fromAccount: z.object({ name: z.string() }),
  toAccount: z.object({ name: z.string() }),
  amount: z.number(),
  date: z.coerce.date(),
  description: z.string().nullable(),
  clientRequestId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TransferResponse = z.infer<typeof transferResponseSchema>;
