import type {
  ContributeSavingsGoalInput,
  CreateSavingsGoalInput,
  UpdateSavingsGoalInput,
} from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SavingsGoal } from '@/lib/types';

const key = ['savings-goals'];

export function useSavingsGoals() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<SavingsGoal[]>('/savings-goals'),
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) =>
      apiClient.post<SavingsGoal>('/savings-goals', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavingsGoalInput }) =>
      apiClient.patch<SavingsGoal>(`/savings-goals/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/savings-goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useContributeSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContributeSavingsGoalInput }) =>
      apiClient.post<SavingsGoal>(`/savings-goals/${id}/contribute`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
