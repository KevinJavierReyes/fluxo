import { cashflowProjectionQuerySchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CashflowProjectionQueryDto extends createZodDto(
  cashflowProjectionQuerySchema,
) {}
