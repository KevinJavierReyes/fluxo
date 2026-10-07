import { createTransferSchema, listTransfersQuerySchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateTransferDto extends createZodDto(createTransferSchema) {}
export class ListTransfersQueryDto extends createZodDto(
  listTransfersQuerySchema,
) {}
