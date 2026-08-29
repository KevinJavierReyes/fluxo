import { z } from "zod";
import { CategoryType } from "../enums";

export const createCategoryGroupSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.nativeEnum(CategoryType),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
  icon: z.string().min(1).max(40).default("wallet"),
  sortOrder: z.coerce.number().int().default(0),
});
export type CreateCategoryGroupInput = z.infer<typeof createCategoryGroupSchema>;

export const updateCategoryGroupSchema = createCategoryGroupSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateCategoryGroupInput = z.infer<typeof updateCategoryGroupSchema>;

export const categoryGroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(CategoryType),
  color: z.string(),
  icon: z.string(),
  sortOrder: z.number(),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CategoryGroupResponse = z.infer<typeof categoryGroupResponseSchema>;

export const createCategorySchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(80),
  sortOrder: z.coerce.number().int().default(0),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryResponseSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
