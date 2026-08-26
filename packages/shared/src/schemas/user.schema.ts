import { z } from "zod";

export const updateUserSchema = z.object({
  timezone: z.string().min(1).max(80).optional(),
  mcpEnabled: z.boolean().optional(),
  mcpMaxTransactionAmount: z.coerce.number().positive().nullable().optional(),
  mcpAllowDelete: z.boolean().optional(),
  mcpAllowConfigWrite: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  timezone: z.string(),
  mcpEnabled: z.boolean(),
  mcpMaxTransactionAmount: z.number().nullable(),
  mcpAllowDelete: z.boolean(),
  mcpAllowConfigWrite: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
