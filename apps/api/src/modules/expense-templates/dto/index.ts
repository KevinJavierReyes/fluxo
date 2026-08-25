import {
  applyExpenseTemplateSchema,
  createExpenseTemplateSchema,
  updateExpenseTemplateSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateExpenseTemplateDto extends createZodDto(
  createExpenseTemplateSchema,
) {}
export class UpdateExpenseTemplateDto extends createZodDto(
  updateExpenseTemplateSchema,
) {}
export class ApplyExpenseTemplateDto extends createZodDto(
  applyExpenseTemplateSchema,
) {}
