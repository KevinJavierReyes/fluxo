import { z } from 'zod';
import { textResult, type ToolDefinition } from '../types';
import {
  GENERIC_RESOURCE_KEYS,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const MAX_LISTED_ITEMS = 40;

const inputSchema = {
  resource: z.enum(GENERIC_RESOURCE_KEYS),
};

export function fluxoListTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_list',
    requiredScope: 'finances:read',
    config: {
      title: 'Listar un recurso de configuración',
      description: `Lista todos los elementos de un recurso de configuración del usuario. Recursos disponibles: ${GENERIC_RESOURCE_KEYS.join(', ')}.`,
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const descriptor = registry[args.resource as ResourceKey];
      const items = await descriptor.list(ctx.userId);
      const summary =
        items.length === 0
          ? `No hay ${descriptor.label}s registrados.`
          : `${items.length} ${descriptor.label}(s).\n` +
            items
              .slice(0, MAX_LISTED_ITEMS)
              .map((item) =>
                descriptor.nameOf ? descriptor.nameOf(item) : item.id,
              )
              .join('\n') +
            (items.length > MAX_LISTED_ITEMS
              ? `\n... y ${items.length - MAX_LISTED_ITEMS} más (recortado en la respuesta).`
              : '');
      return textResult(summary, { items });
    },
  };
}
