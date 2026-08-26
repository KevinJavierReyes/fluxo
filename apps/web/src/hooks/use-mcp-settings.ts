import type { CreatePatInput, UpdateUserInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreatedMcpPat,
  McpActivityEntry,
  McpConnection,
  McpPat,
  Me,
} from '@/lib/types';

interface ActivityPage {
  items: McpActivityEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiClient.get<Me>('/auth/me'),
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => apiClient.patch<Me>('/auth/me', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useMcpConnections() {
  return useQuery({
    queryKey: queryKeys.mcpConnections,
    queryFn: () => apiClient.get<McpConnection[]>('/mcp-settings/connections'),
  });
}

export function useDisconnectMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) =>
      apiClient.delete(`/mcp-settings/connections?clientId=${encodeURIComponent(clientId)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcpConnections }),
  });
}

export function useMcpPats() {
  return useQuery({
    queryKey: queryKeys.mcpPats,
    queryFn: () => apiClient.get<McpPat[]>('/mcp-settings/tokens'),
  });
}

export function useCreateMcpPat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePatInput) =>
      apiClient.post<CreatedMcpPat>('/mcp-settings/tokens', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcpPats }),
  });
}

export function useRevokeMcpPat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/mcp-settings/tokens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcpPats }),
  });
}

export function useMcpActivity() {
  return useQuery({
    queryKey: queryKeys.mcpActivity,
    queryFn: async () => {
      // Igual que /transactions: se pide la primera página con el límite
      // del server y se muestra todo de una, sin "cargar más" todavía — el
      // volumen esperado de actividad MCP por usuario es bajo.
      const page = await apiClient.get<ActivityPage>('/mcp-settings/activity');
      return page.items;
    },
  });
}

export function useUndoMcpActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/mcp-settings/activity/${id}/undo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcpActivity }),
  });
}
