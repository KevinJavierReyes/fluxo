'use client';

import { PencilIcon } from 'lucide-react';
import {
  useCategoryGroups,
  useDeleteCategory,
  useDeleteCategoryGroup,
} from '@/hooks/use-categories';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { CategoryGroupFormDialog } from '@/components/category-group-form-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TRANSACTION_TYPE_META } from '@/lib/transaction-type';
import { GroupChip } from '@/components/group-chip';

export default function CategoriesPage() {
  const { data: groups, isLoading, isError } = useCategoryGroups();
  const deleteGroup = useDeleteCategoryGroup();
  const deleteCategory = useDeleteCategory();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Categorías"
        description="Grupos de ingreso/egreso y sus subcategorías."
        action={
          <div className="flex items-center gap-2">
            <CategoryFormDialog />
            <CategoryGroupFormDialog trigger={<Button type="button" variant="outline">Nuevo grupo</Button>} />
          </div>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus categorías." />}
      {groups && groups.length === 0 && (
        <EmptyState
          message="Aún no tienes grupos de categorías."
          action={
            <CategoryGroupFormDialog
              trigger={<Button type="button" variant="outline">Crear el primero</Button>}
            />
          }
        />
      )}

      <div className="flex flex-col gap-4">
        {groups?.map((group) => (
          <Card key={group.id}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <GroupChip color={group.color} icon={group.icon} />
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
              <div className="flex items-center gap-1">
                <CategoryGroupFormDialog
                  group={group}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Editar grupo"
                    >
                      <PencilIcon />
                    </Button>
                  }
                />
                <ConfirmDeleteButton
                  aria-label="Eliminar grupo"
                  description="Este grupo y sus categorías se eliminarán de forma permanente. Esta acción no se puede deshacer."
                  onConfirm={() => deleteGroup.mutate(group.id)}
                />
              </div>
            </div>
            <div className="divide-y">
              {group.categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm">{category.name}</span>
                  <div className="flex items-center gap-1">
                    <CategoryFormDialog
                      category={category}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Editar categoría"
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <ConfirmDeleteButton
                      aria-label="Eliminar categoría"
                      description="Esta categoría se eliminará de forma permanente. Esta acción no se puede deshacer."
                      onConfirm={() => deleteCategory.mutate(category.id)}
                    />
                  </div>
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
