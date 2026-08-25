import type {
  CreateCategoryGroupInput,
  CreateCategoryInput,
  UpdateCategoryGroupInput,
  UpdateCategoryInput,
} from '@fluxo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Category, CategoryGroup } from '@/lib/types';

export function useCategoryGroups() {
  return useQuery({
    queryKey: queryKeys.categoryGroups,
    queryFn: () => apiClient.get<CategoryGroup[]>('/categories/groups'),
  });
}

export function useCreateCategoryGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryGroupInput) =>
      apiClient.post<CategoryGroup>('/categories/groups', input),
    onSuccess: (created) => {
      // Escribe el grupo recién creado en la caché de inmediato (la respuesta de POST no
      // trae `categories`, así que se completa vacío) para que quien lo esté esperando
      // -p.ej. seleccionarlo justo después de crearlo desde un "+ Crear grupo"- no dependa
      // del round-trip del refetch de invalidateQueries.
      queryClient.setQueryData<CategoryGroup[]>(queryKeys.categoryGroups, (old) =>
        old ? [...old, { ...created, categories: [] }] : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups });
    },
  });
}

export function useUpdateCategoryGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryGroupInput }) =>
      apiClient.patch<CategoryGroup>(`/categories/groups/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups }),
  });
}

export function useDeleteCategoryGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/groups/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => apiClient.post<Category>('/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      apiClient.patch<Category>(`/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups }),
  });
}
