import type { CreateAssetInput, UpdateAssetInput } from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Asset } from '@/lib/types';

const key = ['assets'];

export function useAssets() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<Asset[]>('/assets'),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => apiClient.post<Asset>('/assets', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssetInput }) =>
      apiClient.patch<Asset>(`/assets/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
