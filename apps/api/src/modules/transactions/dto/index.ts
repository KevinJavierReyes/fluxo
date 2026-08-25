import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateTransactionDto extends createZodDto(
  createTransactionSchema,
) {}
export class UpdateTransactionDto extends createZodDto(
  updateTransactionSchema,
) {}
export class ListTransactionsQueryDto extends createZodDto(
  listTransactionsQuerySchema,
) {}
