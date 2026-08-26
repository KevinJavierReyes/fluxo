export const queryKeys = {
  accounts: ['accounts'] as const,
  categoryGroups: ['category-groups'] as const,
  transactions: (filters?: Record<string, string | undefined>) =>
    ['transactions', filters ?? {}] as const,
  overview: (params?: Record<string, string | undefined>) =>
    ['overview', params ?? {}] as const,
  me: ['me'] as const,
  mcpConnections: ['mcp-connections'] as const,
  mcpPats: ['mcp-pats'] as const,
  mcpActivity: ['mcp-activity'] as const,
};
