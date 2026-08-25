import type {
  CreateObligationInput,
  LinkObligationRecurringInput,
  UpdateObligationInput,
} from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Obligation } from '@/lib/types';

const key = ['obligations'];

export function useObligations() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<Obligation[]>('/obligations'),
  });
}

export function useCreateObligation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateObligationInput) =>
      apiClient.post<Obligation>('/obligations', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateObligation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateObligationInput }) =>
      apiClient.patch<Obligation>(`/obligations/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteObligation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/obligations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useLinkObligationRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LinkObligationRecurringInput }) =>
      apiClient.post<Obligation>(`/obligations/${id}/link-recurring`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
    },
  });
}
