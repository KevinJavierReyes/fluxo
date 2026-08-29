import { z } from 'zod';
import type { TransfersService } from '../../transfers/transfers.service';
import { requireResolved } from '../errors/mcp-error';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import { entityResult, type ToolDefinition } from './types';

const inputSchema = {
  fromAccountName: z
    .string()
    .min(1)
    .describe('Nombre (o id) de la cuenta de origen'),
  toAccountName: z
    .string()
    .min(1)
    .describe('Nombre (o id) de la cuenta de destino'),
  amount: z.number().positive(),
  date: z.string().date().describe('YYYY-MM-DD'),
  description: z.string().max(280).optional(),
  clientRequestId: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Generá uno por operación y reenvialo si reintentás, para no duplicar la transferencia',
    ),
};

export function transferBetweenAccountsTool(deps: {
  transfersService: TransfersService;
  accountResolver: AccountResolver;
  policyService: McpPolicyService;
}): ToolDefinition<typeof inputSchema> {
  return {
    name: 'transfer_between_accounts',
    requiredScope: 'finances:write',
    config: {
      title: 'Transferir entre cuentas propias',
      description:
        'Mueve dinero entre dos cuentas propias del usuario (ej. de Ahorros a Corriente). No es un ingreso ni un gasto — no aparece en search_transactions ni afecta presupuestos o reportes por categoría, pero sí el saldo de ambas cuentas en get_dashboard/get_net_worth/get_cashflow_projection.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const amount = args.amount as number;

      const policy = await deps.policyService.getPolicy(ctx.userId);
      deps.policyService.assertAmountWithinLimit(policy, amount);

      const fromAccount = requireResolved(
        await deps.accountResolver.resolve(
          ctx.userId,
          args.fromAccountName as string,
        ),
        args.fromAccountName as string,
      );
      const toAccount = requireResolved(
        await deps.accountResolver.resolve(
          ctx.userId,
          args.toAccountName as string,
        ),
        args.toAccountName as string,
      );

      const { transfer, alreadyExisted } = await deps.transfersService.create(
        ctx.userId,
        {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount,
          date: new Date(args.date as string),
          description: args.description as string | undefined,
          clientRequestId: args.clientRequestId as string | undefined,
        },
      );

      const prefix = alreadyExisted
        ? `Ya habías registrado esto (mismo clientRequestId) — no se duplicó. `
        : '';
      return entityResult(
        `${prefix}Transferencia de ${amount.toFixed(2)} de "${fromAccount.name}" a "${toAccount.name}" registrada.`,
        'transfer',
        transfer.id,
        { transfer, alreadyExisted },
      );
    },
  };
}
