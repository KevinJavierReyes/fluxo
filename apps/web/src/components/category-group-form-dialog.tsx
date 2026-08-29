'use client';

import { useState, type ReactElement } from 'react';
import { CategoryType, createCategoryGroupSchema, type CreateCategoryGroupInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCreateCategoryGroup, useUpdateCategoryGroup } from '@/hooks/use-categories';
import { FormDialog } from '@/components/form-dialog';
import { GroupVisualPicker } from '@/components/group-visual-picker';
import { TransactionTypeSelect } from '@/components/transaction-type-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_GROUP_COLOR, DEFAULT_GROUP_ICON } from '@/lib/category-group-visuals';
import type { CategoryGroup } from '@/lib/types';

function defaultsFor(group?: CategoryGroup): CreateCategoryGroupInput {
  return group
    ? {
        name: group.name,
        type: group.type,
        color: group.color,
        icon: group.icon,
        sortOrder: group.sortOrder,
      }
    : {
        name: '',
        type: CategoryType.EXPENSE,
        color: DEFAULT_GROUP_COLOR,
        icon: DEFAULT_GROUP_ICON,
        sortOrder: 0,
      };
}

/**
 * Crear o editar un grupo de categoría en un modal.
 *
 * Soporta dos formas de abrirse: con su propio `trigger` (uso normal, botón del
 * header o lápiz por fila), o controlado desde afuera vía `open`/`onOpenChange`
 * sin trigger visible — así lo abre el "+ Crear grupo" del `CategoryGroupSelect`
 * cuando el usuario está creando una categoría o un presupuesto y el grupo aún no existe.
 */
export function CategoryGroupFormDialog({
  group,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  group?: CategoryGroup;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;

  const createGroup = useCreateCategoryGroup();
  const updateGroup = useUpdateCategoryGroup();
  const isEdit = Boolean(group);
  const mutation = isEdit ? updateGroup : createGroup;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateCategoryGroupInput>({
    resolver: zodResolver(createCategoryGroupSchema),
    defaultValues: defaultsFor(group),
  });

  const color = useWatch({ control, name: 'color' }) ?? DEFAULT_GROUP_COLOR;
  const icon = useWatch({ control, name: 'icon' }) ?? DEFAULT_GROUP_ICON;

  const onSubmit = handleSubmit(async (values) => {
    if (group) {
      await updateGroup.mutateAsync({ id: group.id, input: values });
    } else {
      await createGroup.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Ver comentario equivalente en account-form-dialog.tsx: sin `!open`, un
        // onOpenChange(true) redundante resetearía el formulario innecesariamente.
        if (next && !open) {
          mutation.reset();
          reset(defaultsFor(group));
        }
      }}
      trigger={
        trigger ??
        (openProp === undefined ? (
          <Button type="button">
            <PlusIcon />
            Nuevo grupo
          </Button>
        ) : undefined)
      }
      title={isEdit ? 'Editar grupo' : 'Nuevo grupo'}
      description={isEdit ? 'Actualiza el nombre, tipo o color de este grupo.' : 'Agrupa categorías de ingreso o gasto.'}
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear grupo'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-group-name">Nombre</Label>
        <Input
          id="category-group-name"
          placeholder="Ej. Vivienda, Transporte, Sueldo"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <TransactionTypeSelect
              value={field.value ?? CategoryType.EXPENSE}
              onValueChange={field.onChange}
              triggerClassName="w-full"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color e ícono</Label>
        <GroupVisualPicker
          color={color}
          icon={icon}
          onColorChange={(next) => setValue('color', next, { shouldDirty: true })}
          onIconChange={(next) => setValue('icon', next, { shouldDirty: true })}
        />
      </div>
    </FormDialog>
  );
}
