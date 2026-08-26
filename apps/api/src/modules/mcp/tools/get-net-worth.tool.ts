import type { NetWorthService } from '../../net-worth/net-worth.service';
import { textResult, type ToolDefinition } from './types';

export function getNetWorthTool(deps: {
  netWorthService: NetWorthService;
}): ToolDefinition<Record<string, never>> {
  return {
    name: 'get_net_worth',
    requiredScope: 'finances:read',
    config: {
      title: 'Ver patrimonio neto',
      description:
        'Patrimonio neto: saldo de cuentas + activos no vendidos − obligaciones no saldadas, con el desglose de cada parte.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handler: async (_args, ctx) => {
      const result = await deps.netWorthService.getNetWorth(
        ctx.userId,
        ctx.timezone,
      );
      return textResult(
        `Patrimonio neto: ${result.netWorth.toFixed(2)} (cuentas ${result.accountsBalance.toFixed(2)} + activos ${result.assetsValue.toFixed(2)} − obligaciones ${result.obligationsValue.toFixed(2)}).`,
        result,
      );
    },
  };
}
