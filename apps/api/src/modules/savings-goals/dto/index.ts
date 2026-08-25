import {
  contributeSavingsGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateSavingsGoalDto extends createZodDto(
  createSavingsGoalSchema,
) {}
export class UpdateSavingsGoalDto extends createZodDto(
  updateSavingsGoalSchema,
) {}
export class ContributeSavingsGoalDto extends createZodDto(
  contributeSavingsGoalSchema,
) {}
