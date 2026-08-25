'use client';

import {
  CategoryType,
  createCategoryGroupSchema,
  createCategorySchema,
  type CreateCategoryGroupInput,
  type CreateCategoryInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import {
  useCategoryGroups,
  useCreateCategory,
  useCreateCategoryGroup,
  useDeleteCategory,
  useDeleteCategoryGroup,
} from '@/hooks/use-categories';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSACTION_TYPE_META } from '@/lib/transaction-type';

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
    defaultValues: { groupId: '', sortOrder: 0 },
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
      <PageHeader title="Categorías" description="Grupos de ingreso/egreso y sus subcategorías." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={groupForm.handleSubmit(onCreateGroup)} className="flex flex-col gap-3">
              <Input placeholder="Nombre del grupo" {...groupForm.register('name')} />
              {groupForm.formState.errors.name && (
                <p className="text-sm text-destructive">{groupForm.formState.errors.name.message}</p>
              )}
              <Controller
                name="type"
                control={groupForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: CategoryType) => (value === CategoryType.INCOME ? 'Ingreso' : 'Egreso')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CategoryType.EXPENSE}>Egreso</SelectItem>
                      <SelectItem value={CategoryType.INCOME}>Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Button type="submit" disabled={groupForm.formState.isSubmitting}>
                <PlusIcon />
                Crear grupo
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nueva categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={categoryForm.handleSubmit(onCreateCategory)} className="flex flex-col gap-3">
              <Controller
                name="groupId"
                control={categoryForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un grupo">
                        {(value: string) => groups?.find((g) => g.id === value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {categoryForm.formState.errors.groupId && (
                <p className="text-sm text-destructive">{categoryForm.formState.errors.groupId.message}</p>
              )}
              <Input placeholder="Nombre de la categoría" {...categoryForm.register('name')} />
              {categoryForm.formState.errors.name && (
                <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
              )}
              <Button type="submit" disabled={categoryForm.formState.isSubmitting}>
                <PlusIcon />
                Crear categoría
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus categorías." />}
      {groups && groups.length === 0 && <EmptyState message="Aún no tienes grupos de categorías." />}

      <div className="flex flex-col gap-4">
        {groups?.map((group) => (
          <Card key={group.id}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{group.name}</span>
                {(() => {
                  const meta = TRANSACTION_TYPE_META[group.type];
                  const Icon = meta.icon;
                  return (
                    <Badge variant={meta.variant}>
                      <Icon data-icon="inline-start" />
                      {meta.label}
                    </Badge>
                  );
                })()}
              </div>
              <ConfirmDeleteButton
                aria-label="Eliminar grupo"
                description="Este grupo y sus categorías se eliminarán de forma permanente. Esta acción no se puede deshacer."
                onConfirm={() => deleteGroup.mutate(group.id)}
              />
            </div>
            <div className="divide-y">
              {group.categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm">{category.name}</span>
                  <ConfirmDeleteButton
                    aria-label="Eliminar categoría"
                    description="Esta categoría se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteCategory.mutate(category.id)}
                  />
                </div>
              ))}
              {group.categories.length === 0 && (
                <p className="px-4 py-2 text-sm text-muted-foreground">Sin categorías todavía.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
