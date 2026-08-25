import {
  createObligationSchema,
  linkObligationRecurringSchema,
  updateObligationSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateObligationDto extends createZodDto(createObligationSchema) {}
export class UpdateObligationDto extends createZodDto(updateObligationSchema) {}
export class LinkObligationRecurringDto extends createZodDto(
  linkObligationRecurringSchema,
) {}
