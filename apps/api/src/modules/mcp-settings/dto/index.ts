import { createPatSchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreatePatDto extends createZodDto(createPatSchema) {}
