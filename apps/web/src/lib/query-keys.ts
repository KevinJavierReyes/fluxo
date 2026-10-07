import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  accounts: ['accounts'] as const,
  categoryGroups: ['category-groups'] as const,
  transactions: (filters?: Record<string, string | undefined>) =>
    ['transactions', filters ?? {}] as const,
  overview: (params?: Record<string, string | undefined>) =>
    ['overview', params ?? {}] as const,
  cashflowProjection: (params?: Record<string, string | undefined>) =>
    ['cashflow-projection', params ?? {}] as const,
  me: ['me'] as const,
  mcpConnections: ['mcp-connections'] as const,
  mcpPats: ['mcp-pats'] as const,
  mcpActivity: ['mcp-activity'] as const,
};

/**
 * Toda mutación que crea, edita, confirma o borra una transacción cambia la
 * lista, los saldos por cuenta, la vista general y la proyección: se invalidan
 * juntas para que ninguna quede mostrando saldos viejos.
 */
export function invalidateMoneyQueries(queryClient: QueryClient) {
  for (const key of [
    ['transactions'],
    queryKeys.accounts,
    ['overview'],
    ['cashflow-projection'],
    ['dashboard-summary'],
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
