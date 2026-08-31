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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { useDeleteCategoryGroup } from '@/hooks/use-categories';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { CategoryGroupFormDialog } from '@/components/category-group-form-dialog';
import { SortableCategoryRow } from '@/components/sortable-category-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GroupChip } from '@/components/group-chip';
import { TRANSACTION_TYPE_META } from '@/lib/transaction-type';
import type { CategoryGroup } from '@/lib/types';

export function SortableGroupCard({
  group,
  onReorderCategories,
}: {
  group: CategoryGroup;
  onReorderCategories: (ids: string[]) => void;
}) {
  const deleteGroup = useDeleteCategoryGroup();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.categories.findIndex((c) => c.id === active.id);
    const newIndex = group.categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderCategories(arrayMove(group.categories, oldIndex, newIndex).map((c) => c.id));
  }

  const meta = TRANSACTION_TYPE_META[group.type];
  const Icon = meta.icon;

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging || undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Reordenar grupo"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <GroupChip color={group.color} icon={group.icon} />
          <span className="truncate font-medium">{group.name}</span>
          <Badge variant={meta.variant}>
            <Icon data-icon="inline-start" />
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <CategoryFormDialog
            defaultGroupId={group.id}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Agregar categoría"
              >
                <PlusIcon />
              </Button>
            }
          />
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
        <DndContext sensors={sensors} onDragEnd={handleCategoryDragEnd}>
          <SortableContext
            items={group.categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {group.categories.map((category) => (
              <SortableCategoryRow key={category.id} category={category} />
            ))}
          </SortableContext>
        </DndContext>
        {group.categories.length === 0 && (
          <p className="px-4 py-2 text-sm text-muted-foreground">Sin categorías todavía.</p>
        )}
      </div>
    </Card>
  );
}
