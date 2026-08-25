import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateRecurringRuleDto extends createZodDto(
  createRecurringRuleSchema,
) {}
export class UpdateRecurringRuleDto extends createZodDto(
  updateRecurringRuleSchema,
) {}
