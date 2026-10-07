import type { CreateRecurringRuleInput, UpdateRecurringRuleInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateMoneyQueries } from '@/lib/query-keys';
import type { RecurringRule } from '@/lib/types';

const key = ['recurring-rules'];

export function useRecurringRules() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<RecurringRule[]>('/recurring-rules'),
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringRuleInput) =>
      apiClient.post<RecurringRule>('/recurring-rules', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      invalidateMoneyQueries(queryClient);
    },
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecurringRuleInput }) =>
      apiClient.patch<RecurringRule>(`/recurring-rules/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      invalidateMoneyQueries(queryClient);
    },
  });
}

export function useDeleteRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteConfirmed = false }: { id: string; deleteConfirmed?: boolean }) =>
      apiClient.delete(`/recurring-rules/${id}?deleteConfirmed=${deleteConfirmed}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      invalidateMoneyQueries(queryClient);
    },
  });
}
