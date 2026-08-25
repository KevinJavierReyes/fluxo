import type { CreateTransactionInput, UpdateTransactionInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Transaction } from '@/lib/types';

export function useTransactions(filters?: { accountId?: string; categoryId?: string }) {
  const params = new URLSearchParams();
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  const query = params.toString();

  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => apiClient.get<Transaction[]>(`/transactions${query ? `?${query}` : ''}`),
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
