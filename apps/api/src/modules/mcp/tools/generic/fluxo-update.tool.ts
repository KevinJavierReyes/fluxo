import { z } from 'zod';
import type { McpPolicyService } from '../../policy/mcp-policy.service';
import { entityResult, type ToolDefinition } from '../types';
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
    .describe('El id exacto — usa fluxo_search para encontrarlo primero'),
  data: z
    .record(z.unknown())
    .describe(
      'Solo los campos que cambian. Usa fluxo_describe(resource) para el schema completo.',
    ),
};

export function fluxoUpdateTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
  policyService: McpPolicyService,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_update',
    requiredScope: 'config:write',
    config: {
      title: 'Editar un recurso de configuración',
      description: `Edita un elemento existente de un recurso de configuración por su id. Recursos: ${RESOURCE_KEYS.join(', ')}.`,
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await policyService.getPolicy(ctx.userId);
      policyService.assertConfigWriteAllowed(policy);

      const descriptor = registry[args.resource as ResourceKey];
      const parsed = descriptor.updateSchema.parse(args.data) as Record<
        string,
        unknown
      >;
      const updated = await descriptor.update(
        ctx.userId,
        args.id as string,
        parsed,
      );
      const label = descriptor.nameOf
        ? descriptor.nameOf(updated)
        : (updated.id as string);

      return entityResult(
        `${descriptor.label} "${label}" actualizado.`,
        descriptor.key,
        updated.id as string,
        { item: updated },
      );
    },
  };
}
