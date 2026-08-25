import { z } from "zod";
import { AccountType } from "../enums";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.nativeEnum(AccountType).default(AccountType.BANK),
  openingBalance: z.coerce.number().finite().default(0),
  openingBalanceDate: z.coerce.date().default(() => new Date()),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const accountResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(AccountType),
  openingBalance: z.number(),
  openingBalanceDate: z.coerce.date(),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AccountResponse = z.infer<typeof accountResponseSchema>;
