import { z } from 'zod';
import type { TransactionsService } from '../../transactions/transactions.service';
import { McpToolError } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'El id exacto de la transacción — usa search_transactions para encontrarlo',
    ),
  confirm: z
    .literal(true)
    .describe(
      'Tiene que ser exactamente `true` — confirmación explícita de que se quiere borrar',
    ),
};

export function deleteTransactionTool(deps: {
  transactionsService: TransactionsService;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'delete_transaction',
    requiredScope: 'finances:write',
    config: {
      title: 'Borrar transacción',
      description:
        'Borra una transacción por su id. Requiere confirm:true. No se puede borrar una ocurrencia generada por una regla recurrente (desactivá la regla en su lugar) ni si el usuario deshabilitó el borrado vía agente.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertDeleteAllowed(policy);

      const existing = await deps.transactionsService.findOne(
        ctx.userId,
        args.id as string,
      );
      if (existing.source === 'RECURRING') {
        throw new McpToolError(
          'VALIDATION',
          'Es una ocurrencia generada por una regla recurrente. Borrarla se deshace en la próxima generación — para evitarla de verdad, desactivá la regla con fluxo_update (resource: "recurring_rule").',
        );
      }

      await deps.transactionsService.remove(ctx.userId, args.id as string);

      return entityResult(
        'Transacción borrada.',
        'transaction',
        args.id as string,
        {
          id: args.id,
          deleted: true,
        },
      );
    },
  };
}
