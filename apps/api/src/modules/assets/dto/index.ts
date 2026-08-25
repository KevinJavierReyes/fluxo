import { createAssetSchema, updateAssetSchema } from '@fluxo/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateAssetDto extends createZodDto(createAssetSchema) {}
export class UpdateAssetDto extends createZodDto(updateAssetSchema) {}
