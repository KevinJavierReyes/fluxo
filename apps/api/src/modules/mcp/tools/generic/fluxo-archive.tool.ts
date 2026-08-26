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
  id: z.string().min(1),
  confirm: z.literal(true).describe('Tiene que ser exactamente `true`'),
};

export function fluxoArchiveTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
  policyService: McpPolicyService,
): ToolDefinition<typeof inputSchema> {
  return {
    name: 'fluxo_archive',
    requiredScope: 'config:write',
    config: {
      title: 'Archivar o borrar un recurso de configuración',
      description: `Da de baja un elemento de un recurso de configuración por su id. Requiere confirm:true. Si el elemento tiene referencias (transacciones, reglas, etc.) se archiva en vez de borrarse; de lo contrario se borra. Opera sobre un solo elemento por llamada — no hay borrado masivo. Recursos: ${RESOURCE_KEYS.join(', ')}.`,
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await policyService.getPolicy(ctx.userId);
      policyService.assertConfigWriteAllowed(policy);

      const descriptor = registry[args.resource as ResourceKey];
      const result = await descriptor.archive(ctx.userId, args.id as string);

      const verb = result.action === 'archived' ? 'archivado' : 'borrado';
      return entityResult(
        `${descriptor.label} ${verb}.`,
        descriptor.key,
        result.id,
        { ...result },
      );
    },
  };
}
