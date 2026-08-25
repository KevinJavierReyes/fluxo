import { z } from "zod";

export const createAssetSchema = z.object({
  name: z.string().min(1).max(120),
  estimatedValue: z.coerce.number().nonnegative(),
  maxSaleTimeDays: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial().extend({
  isSold: z.boolean().optional(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assetResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  estimatedValue: z.number(),
  maxSaleTimeDays: z.number().nullable(),
  notes: z.string().nullable(),
  isSold: z.boolean(),
  soldAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AssetResponse = z.infer<typeof assetResponseSchema>;
