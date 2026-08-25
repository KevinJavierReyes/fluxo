import {
  budgetStatusQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateBudgetDto extends createZodDto(createBudgetSchema) {}
export class UpdateBudgetDto extends createZodDto(updateBudgetSchema) {}
export class BudgetStatusQueryDto extends createZodDto(
  budgetStatusQuerySchema,
) {}
