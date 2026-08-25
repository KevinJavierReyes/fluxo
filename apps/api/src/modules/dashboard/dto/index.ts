import { overviewQuerySchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class OverviewQueryDto extends createZodDto(overviewQuerySchema) {}
