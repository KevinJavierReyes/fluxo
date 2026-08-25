'use client';

import { useState, type ReactElement } from 'react';
import { createAssetSchema, type CreateAssetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateAsset, useUpdateAsset } from '@/hooks/use-assets';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Asset } from '@/lib/types';

function defaultsFor(asset?: Asset): CreateAssetInput {
  return asset
    ? {
        name: asset.name,
        estimatedValue: Number(asset.estimatedValue),
        maxSaleTimeDays: asset.maxSaleTimeDays ?? undefined,
        notes: asset.notes ?? undefined,
      }
    : {
        name: '',
        estimatedValue: 0,
        maxSaleTimeDays: undefined,
        notes: undefined,
      };
}

/**
 * Crear o editar un activo en un modal. Si viene `asset`, edita ese activo.
 */
export function AssetFormDialog({ asset, trigger }: { asset?: Asset; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const isEdit = Boolean(asset);
  const mutation = isEdit ? updateAsset : createAsset;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: defaultsFor(asset),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (asset) {
      await updateAsset.mutateAsync({ id: asset.id, input: values });
    } else {
      await createAsset.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Ver comentario equivalente en account-form-dialog.tsx: sin `!open`, un
        // onOpenChange(true) redundante (p.ej. al cerrar un diálogo anidado) resetearía
        // el formulario y borraría lo que el usuario ya escribió.
        if (next && !open) {
          mutation.reset();
          reset(defaultsFor(asset));
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Agregar activo
          </Button>
        )
      }
      title={isEdit ? 'Editar activo' : 'Nuevo activo'}
      description={
        isEdit
          ? 'Actualiza los datos de este activo.'
          : 'Bienes que podrías convertir en efectivo si tu flujo de caja lo necesitara.'
      }
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Agregar activo'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset-name">Activo</Label>
        <Input id="asset-name" placeholder="Ej. Auto, laptop, joyas" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asset-estimated-value">¿Cuánto me pagarían por él?</Label>
          <Input
            id="asset-estimated-value"
            type="number"
            step="0.01"
            aria-invalid={!!errors.estimatedValue}
            {...register('estimatedValue')}
          />
          {errors.estimatedValue && (
            <p className="text-sm text-destructive">{errors.estimatedValue.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asset-max-sale-time">Días máximo para venderlo</Label>
          <Input
            id="asset-max-sale-time"
            type="number"
            min={0}
            {...register('maxSaleTimeDays', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset-notes">Observaciones</Label>
        <Input id="asset-notes" {...register('notes')} />
      </div>
    </FormDialog>
  );
}
