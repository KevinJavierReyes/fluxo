'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon, PencilIcon } from 'lucide-react';
import { useDeleteCategory } from '@/hooks/use-categories';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

export function SortableCategoryRow({ category }: { category: Category }) {
  const deleteCategory = useDeleteCategory();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="flex items-center justify-between px-4 py-2"
      data-dragging={isDragging || undefined}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Reordenar categoría"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <span className="truncate text-sm">{category.name}</span>
      </div>
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
  );
}
