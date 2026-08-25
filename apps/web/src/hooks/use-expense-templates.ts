import type {
  ApplyExpenseTemplateInput,
  CreateExpenseTemplateInput,
  UpdateExpenseTemplateInput,
} from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ExpenseTemplate, Transaction } from '@/lib/types';

const key = ['expense-templates'];

export function useExpenseTemplates() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<ExpenseTemplate[]>('/expense-templates'),
  });
}

export function useCreateExpenseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseTemplateInput) =>
      apiClient.post<ExpenseTemplate>('/expense-templates', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateExpenseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseTemplateInput }) =>
      apiClient.patch<ExpenseTemplate>(`/expense-templates/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteExpenseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/expense-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useApplyExpenseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplyExpenseTemplateInput }) =>
      apiClient.post<Transaction>(`/expense-templates/${id}/apply`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
