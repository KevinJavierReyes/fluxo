import type { CreateTransactionInput, UpdateTransactionInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Transaction } from '@/lib/types';

interface PaginatedTransactions {
  items: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

// La API pagina /transactions por cursor. La página de transacciones no
// implementa "cargar más" todavía, así que se pide el límite máximo (200)
// para preservar el comportamiento anterior de "traer todo" en la mayoría
// de los casos; con más de 200 movimientos en el rango, la lista se trunca.
const MAX_PAGE_SIZE = 200;

export function useTransactions(filters?: {
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  params.set('limit', String(MAX_PAGE_SIZE));
  const query = params.toString();

  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: async () => {
      const page = await apiClient.get<PaginatedTransactions>(
        `/transactions${query ? `?${query}` : ''}`,
      );
      return page.items;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      apiClient.post<Transaction>('/transactions', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      apiClient.patch<Transaction>(`/transactions/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}
