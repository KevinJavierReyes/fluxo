import {
  createCategoryGroupSchema,
  createCategorySchema,
  reorderSchema,
  updateCategoryGroupSchema,
  updateCategorySchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryGroupDto extends createZodDto(
  createCategoryGroupSchema,
) {}
export class UpdateCategoryGroupDto extends createZodDto(
  updateCategoryGroupSchema,
) {}
export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
export class ReorderCategoryGroupsDto extends createZodDto(reorderSchema) {}
export class ReorderCategoriesDto extends createZodDto(reorderSchema) {}
