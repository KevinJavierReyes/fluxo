import { z } from 'zod';
import { textResult, type ToolDefinition } from '../types';
import {
  RESOURCE_KEYS,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const inputSchema = {
  resource: z.enum(RESOURCE_KEYS),
};

export function fluxoListTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_list',
    requiredScope: 'finances:read',
    config: {
      title: 'Listar un recurso de configuración',
      description:
        `Lista todos los elementos de un recurso de configuración del usuario. Recursos disponibles: ${RESOURCE_KEYS.join(', ')}. ` +
        'Usa fluxo_describe primero si no conocés los campos de ese recurso.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const descriptor = registry[args.resource as ResourceKey];
      const items = await descriptor.list(ctx.userId);
      const summary =
        items.length === 0
          ? `No hay ${descriptor.label}s registrados.`
          : `${items.length} ${descriptor.label}(s).`;
      return textResult(summary, { items });
    },
  };
}
