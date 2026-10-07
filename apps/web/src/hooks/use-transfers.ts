import type { CreateTransferInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateMoneyQueries, queryKeys } from '@/lib/query-keys';
import type { Transfer } from '@/lib/types';

export function useTransfers() {
  return useQuery({
    queryKey: queryKeys.transfers,
    queryFn: () => apiClient.get<Transfer[]>('/transfers'),
  });
}

// Una transferencia mueve saldos entre cuentas: además de su propia lista,
// cambia el saldo por cuenta, la vista general y la proyección.
export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransferInput) => apiClient.post<Transfer>('/transfers', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
      invalidateMoneyQueries(queryClient);
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transfers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
      invalidateMoneyQueries(queryClient);
    },
  });
}
