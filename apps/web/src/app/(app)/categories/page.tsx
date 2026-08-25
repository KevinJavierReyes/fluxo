'use client';

import {
  CategoryType,
  createCategoryGroupSchema,
  createCategorySchema,
  type CreateCategoryGroupInput,
  type CreateCategoryInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  useCategoryGroups,
  useCreateCategory,
  useCreateCategoryGroup,
  useDeleteCategory,
  useDeleteCategoryGroup,
} from '@/hooks/use-categories';
import { QueryError } from '@/components/query-error';

export default function CategoriesPage() {
  const { data: groups, isLoading, isError } = useCategoryGroups();
  const createGroup = useCreateCategoryGroup();
  const deleteGroup = useDeleteCategoryGroup();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const groupForm = useForm<CreateCategoryGroupInput>({
    resolver: zodResolver(createCategoryGroupSchema),
    defaultValues: { type: CategoryType.EXPENSE, sortOrder: 0 },
  });

  const categoryForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { sortOrder: 0 },
  });

  const onCreateGroup = async (values: CreateCategoryGroupInput) => {
    await createGroup.mutateAsync(values);
    groupForm.reset({ name: '', type: CategoryType.EXPENSE, sortOrder: 0 });
  };

  const onCreateCategory = async (values: CreateCategoryInput) => {
    await createCategory.mutateAsync(values);
    categoryForm.reset({ groupId: values.groupId, name: '', sortOrder: 0 });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <p className="text-gray-600">Grupos de ingreso/egreso y sus subcategorías.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={groupForm.handleSubmit(onCreateGroup)}
          className="flex flex-col gap-3 rounded border p-4"
        >
          <h2 className="font-medium">Nuevo grupo</h2>
          <input
            placeholder="Nombre del grupo"
            className="rounded border px-3 py-2"
            {...groupForm.register('name')}
          />
          {groupForm.formState.errors.name && (
            <p className="text-sm text-red-600">{groupForm.formState.errors.name.message}</p>
          )}
          <select className="rounded border px-3 py-2" {...groupForm.register('type')}>
            <option value={CategoryType.EXPENSE}>Egreso</option>
            <option value={CategoryType.INCOME}>Ingreso</option>
          </select>
          <button
            type="submit"
            disabled={groupForm.formState.isSubmitting}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Crear grupo
          </button>
        </form>

        <form
          onSubmit={categoryForm.handleSubmit(onCreateCategory)}
          className="flex flex-col gap-3 rounded border p-4"
        >
          <h2 className="font-medium">Nueva categoría</h2>
          <select className="rounded border px-3 py-2" {...categoryForm.register('groupId')}>
            <option value="">Selecciona un grupo</option>
            {groups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {categoryForm.formState.errors.groupId && (
            <p className="text-sm text-red-600">
              {categoryForm.formState.errors.groupId.message}
            </p>
          )}
          <input
            placeholder="Nombre de la categoría"
            className="rounded border px-3 py-2"
            {...categoryForm.register('name')}
          />
          {categoryForm.formState.errors.name && (
            <p className="text-sm text-red-600">{categoryForm.formState.errors.name.message}</p>
          )}
          <button
            type="submit"
            disabled={categoryForm.formState.isSubmitting}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Crear categoría
          </button>
        </form>
      </div>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus categorías." />}

      <div className="flex flex-col gap-4">
        {groups?.map((group) => (
          <div key={group.id} className="rounded border">
            <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
              <span className="font-medium">
                {group.name}{' '}
                <span className="text-sm text-gray-500">
                  ({group.type === CategoryType.INCOME ? 'Ingreso' : 'Egreso'})
                </span>
              </span>
              <button
                type="button"
                onClick={() => deleteGroup.mutate(group.id)}
                className="text-sm text-red-600 underline"
              >
                Eliminar grupo
              </button>
            </div>
            <ul className="divide-y">
              {group.categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between px-4 py-2">
                  <span>{category.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteCategory.mutate(category.id)}
                    className="text-sm text-red-600 underline"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
              {group.categories.length === 0 && (
                <li className="px-4 py-2 text-sm text-gray-500">Sin categorías todavía.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
