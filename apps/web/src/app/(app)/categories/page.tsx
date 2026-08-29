'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCategoryGroups, useReorderCategories, useReorderCategoryGroups } from '@/hooks/use-categories';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { CategoryGroupFormDialog } from '@/components/category-group-form-dialog';
import { SortableGroupCard } from '@/components/sortable-group-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  const { data: groups, isLoading, isError } = useCategoryGroups();
  const reorderGroups = useReorderCategoryGroups();
  const reorderCategories = useReorderCategories();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !groups) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderGroups.mutate(arrayMove(groups, oldIndex, newIndex).map((g) => g.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Categorías"
        description="Grupos de ingreso/egreso y sus subcategorías."
        action={<CategoryGroupFormDialog />}
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
        <DndContext sensors={sensors} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groups?.map((g) => g.id) ?? []} strategy={verticalListSortingStrategy}>
            {groups?.map((group) => (
              <SortableGroupCard
                key={group.id}
                group={group}
                onReorderCategories={(ids) => reorderCategories.mutate({ groupId: group.id, ids })}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
