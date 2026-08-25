import { createAccountSchema, updateAccountSchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
