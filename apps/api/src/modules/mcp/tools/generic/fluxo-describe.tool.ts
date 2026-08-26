import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { textResult, type ToolDefinition } from '../types';
import {
  RESOURCE_KEYS,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const inputSchema = {
  resource: z.enum(RESOURCE_KEYS),
};

// zod-to-json-schema es puro (mismo input -> mismo output); se memoiza al
// arrancar el módulo porque los schemas de packages/shared son estáticos.
const schemaCache = new Map<string, { create: object; update: object }>();

function describeSchemas(descriptor: ResourceDescriptor): {
  create: object;
  update: object;
} {
  const cached = schemaCache.get(descriptor.key);
  if (cached) {
    return cached;
  }
  const result = {
    create: zodToJsonSchema(descriptor.createSchema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    }),
    update: zodToJsonSchema(descriptor.updateSchema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    }),
  };
  schemaCache.set(descriptor.key, result);
  return result;
}

export function fluxoDescribeTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_describe',
    requiredScope: 'finances:read',
    config: {
      title: 'Describir un recurso de configuración',
      description: `Devuelve el schema de campos (para crear y editar) de un recurso, junto con los valores que ya existen del usuario para ese recurso. Recursos: ${RESOURCE_KEYS.join(', ')}.`,
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const descriptor = registry[args.resource as ResourceKey];
      const schemas = describeSchemas(descriptor);
      const items = await descriptor.list(ctx.userId);
      const existing = descriptor.nameOf
        ? items.map((item) => ({
            id: item.id,
            label: descriptor.nameOf!(item),
          }))
        : items.map((item) => ({ id: item.id }));

      return textResult(
        `Schema de "${descriptor.label}" y ${existing.length} valor(es) existentes.`,
        {
          resource: descriptor.key,
          createSchema: schemas.create,
          updateSchema: schemas.update,
          existing,
        },
      );
    },
  };
}
