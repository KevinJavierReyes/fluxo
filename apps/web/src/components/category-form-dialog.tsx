'use client';

import { useState, type ReactElement } from 'react';
import { createCategorySchema, type CreateCategoryInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useCategoryGroups, useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import { FormDialog } from '@/components/form-dialog';
import { CategoryGroupFormDialog } from '@/components/category-group-form-dialog';
import { CategoryGroupSelect } from '@/components/category-group-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category } from '@/lib/types';

function defaultsFor(category?: Category, groupId?: string): CreateCategoryInput {
  return category
    ? { groupId: category.groupId, name: category.name, sortOrder: category.sortOrder }
    : { groupId: groupId ?? '', name: '', sortOrder: 0 };
}

/**
 * Crear o editar una categoría en un modal. En modo edición solo se puede cambiar
 * el nombre (`updateCategorySchema` no permite mover una categoría de grupo).
 *
 * En modo creación, tras guardar el modal no se cierra: se limpia el nombre y se
 * conserva el grupo, con foco de vuelta en el input, para encadenar varias
 * categorías del mismo grupo sin reabrir el modal — igual que hacía el formulario
 * inline que reemplaza.
 */
export function CategoryFormDialog({
  category,
  defaultGroupId,
  trigger,
}: {
  category?: Category;
  /** Grupo preseleccionado al crear (p.ej. si se abre desde la tarjeta de un grupo). */
  defaultGroupId?: string;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const { data: groups } = useCategoryGroups();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = Boolean(category);
  const mutation = isEdit ? updateCategory : createCategory;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: defaultsFor(category, defaultGroupId),
  });

  const submitAndClose = handleSubmit(async (values) => {
    if (category) {
      await updateCategory.mutateAsync({ id: category.id, input: { name: values.name } });
    } else {
      await createCategory.mutateAsync(values);
    }
    setOpen(false);
  });

  const submitAndContinue = handleSubmit(async (values) => {
    await createCategory.mutateAsync(values);
    reset({ groupId: values.groupId, name: '', sortOrder: 0 });
    setFocus('name');
  });

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Sin `!open`, el onOpenChange(true) que Base UI reemite por eventos de
          // refoco (p.ej. al cerrarse el diálogo anidado de "+ Crear grupo") resetearía
          // el formulario aunque el diálogo ya estuviera abierto.
          if (next && !open) {
            mutation.reset();
            reset(defaultsFor(category, defaultGroupId));
          }
        }}
        trigger={
          trigger ?? (
            <Button type="button">
              <PlusIcon />
              Nueva categoría
            </Button>
          )
        }
        title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
        description={
          isEdit
            ? 'Solo puedes cambiar el nombre; para moverla a otro grupo crea una nueva.'
            : 'Agrega una subcategoría a un grupo existente.'
        }
        onSubmit={submitAndClose}
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear categoría'}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        error={mutation.isError ? mutation.error.message : null}
      >
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-group">Grupo</Label>
            <Controller
              name="groupId"
              control={control}
              render={({ field }) => (
                <CategoryGroupSelect
                  groups={groups}
                  value={field.value}
                  onValueChange={field.onChange}
                  triggerClassName="w-full"
                  ariaInvalid={!!errors.groupId}
                  onCreateGroup={() => setCreateGroupOpen(true)}
                />
              )}
            />
            {errors.groupId && <p className="text-sm text-destructive">{errors.groupId.message}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-name">Nombre</Label>
          <Input
            id="category-name"
            placeholder="Ej. Supermercado, Netflix, Sueldo"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {!isEdit && (
          <Button type="button" variant="outline" onClick={submitAndContinue} disabled={isSubmitting}>
            Guardar y crear otra
          </Button>
        )}
      </FormDialog>

      {/* El grupo recién creado no queda preseleccionado (una limitación del Select
          subyacente): aparece en la lista y el usuario lo elige con un clic más. */}
      <CategoryGroupFormDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </>
  );
}
