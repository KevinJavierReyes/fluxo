'use client';

import { createAssetSchema, type CreateAssetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateAsset, useDeleteAsset, useAssets, useUpdateAsset } from '@/hooks/use-assets';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssetsPage() {
  const { data: assets, isLoading, isError } = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(createAssetSchema),
  });

  const onSubmit = async (values: CreateAssetInput) => {
    await createAsset.mutateAsync(values);
    reset({});
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Activos"
        description="Bienes que podrías convertir en efectivo si tu flujo de caja lo necesitara."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Activo</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>¿Cuánto me pagarían por él?</Label>
              <Input type="number" step="0.01" className="w-32" {...register('estimatedValue')} />
              {errors.estimatedValue && (
                <p className="text-sm text-destructive">{errors.estimatedValue.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Días máximo para venderlo</Label>
              <Input
                type="number"
                min={0}
                className="w-32"
                {...register('maxSaleTimeDays', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Observaciones</Label>
              <Input {...register('notes')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Agregar activo
            </Button>
            {createAsset.isError && (
              <p className="w-full text-sm text-destructive">{createAsset.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus activos." />}
      {assets && assets.length === 0 && <EmptyState message="Aún no tienes activos registrados." />}

      {assets && assets.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between px-4 py-3 first:pt-4 last:pb-4">
                <div>
                  <p className={`font-medium ${asset.isSold ? 'text-muted-foreground line-through' : ''}`}>
                    {asset.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    S/ {Number(asset.estimatedValue).toFixed(2)}
                    {asset.maxSaleTimeDays !== null && ` · hasta ${asset.maxSaleTimeDays} días para vender`}
                  </p>
                  {asset.notes && <p className="text-sm text-muted-foreground">{asset.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={asset.isSold}
                      onCheckedChange={(checked) =>
                        updateAsset.mutate({ id: asset.id, input: { isSold: checked === true } })
                      }
                    />
                    Vendido
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar activo"
                    onClick={() => deleteAsset.mutate(asset.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
