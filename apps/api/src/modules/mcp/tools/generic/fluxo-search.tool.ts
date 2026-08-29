import { z } from 'zod';
import { matchByName } from '../../resolvers/resolve-result';
import { textResult, type ToolDefinition } from '../types';
import {
  GENERIC_RESOURCE_KEYS,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const inputSchema = {
  resource: z.enum(GENERIC_RESOURCE_KEYS),
  q: z.string().min(1).describe('Texto a buscar por nombre'),
};

export function fluxoSearchTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_search',
    requiredScope: 'finances:read',
    config: {
      title: 'Buscar un elemento por nombre',
      description:
        'Busca un elemento de un recurso de configuración por nombre aproximado. Devuelve todas las coincidencias con su id — úsalo antes de fluxo_update/fluxo_archive o de cualquier operación que necesite un id exacto, en vez de adivinarlo.',
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (args, ctx) => {
      const descriptor = registry[args.resource as ResourceKey];
      if (!descriptor.nameOf) {
        return textResult(
          `El recurso "${descriptor.label}" no tiene un campo de nombre para buscar por texto; usa fluxo_list para verlos todos.`,
        );
      }
      const items = await descriptor.list(ctx.userId);
      const matches = matchByName(args.q as string, items, descriptor.nameOf);

      if (matches.length === 0) {
        return textResult(
          `No encontré ningún(a) ${descriptor.label} que coincida con "${args.q as string}".`,
          {
            matches: [],
          },
        );
      }
      const matchList = matches.map((m) => ({
        id: m.id as string,
        label: descriptor.nameOf!(m),
      }));
      const summary =
        `${matches.length} coincidencia(s) para "${args.q as string}":\n` +
        matchList.map((m) => `${m.label} (id: ${m.id})`).join('\n');
      return textResult(summary, { matches: matchList });
    },
  };
}
