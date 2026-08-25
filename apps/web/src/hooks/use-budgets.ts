import type { CreateBudgetInput, UpdateBudgetInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Budget, BudgetStatus } from '@/lib/types';

const key = ['budgets'];

export function useBudgets() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<Budget[]>('/budgets'),
  });
}

export function useBudgetStatus(month?: string) {
  return useQuery({
    queryKey: ['budgets-status', month],
    queryFn: () =>
      apiClient.get<BudgetStatus[]>(`/budgets/status${month ? `?month=${month}` : ''}`),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => apiClient.post<Budget>('/budgets', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBudgetInput }) =>
      apiClient.patch<Budget>(`/budgets/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}
