import { z } from 'zod';
import { textResult, type ToolDefinition } from '../types';
import {
  RESOURCE_KEYS,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const inputSchema = {
  resource: z.enum(RESOURCE_KEYS),
  id: z
    .string()
    .min(1)
    .describe(
      'El id exacto (no el nombre) — usa fluxo_search para encontrarlo primero',
    ),
};

export function fluxoGetTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_get',
    requiredScope: 'finances:read',
    config: {
      title: 'Obtener un elemento por id',
      description: `Obtiene un elemento de un recurso de configuración por su id exacto. Recursos: ${RESOURCE_KEYS.join(', ')}.`,
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const descriptor = registry[args.resource as ResourceKey];
      const item = await descriptor.get(ctx.userId, args.id as string);
      const label = descriptor.nameOf
        ? descriptor.nameOf(item)
        : (item.id as string);
      return textResult(`${descriptor.label}: ${label}`, { item });
    },
  };
}
