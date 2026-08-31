'use client';

import { PencilIcon } from 'lucide-react';
import { useAssets, useDeleteAsset, useUpdateAsset } from '@/hooks/use-assets';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { AssetFormDialog } from '@/components/asset-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssetsPage() {
  const { data: assets, isLoading, isError } = useAssets();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Activos"
        description="Bienes que podrías convertir en efectivo si tu flujo de caja lo necesitara."
        action={<AssetFormDialog />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus activos." />}
      {assets && assets.length === 0 && (
        <EmptyState
          message="Aún no tienes activos registrados."
          action={<AssetFormDialog trigger={<Button type="button" variant="outline">Agregar el primero</Button>} />}
        />
      )}

      {assets && assets.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-2 px-4 py-3 first:pt-4 last:pb-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className={`truncate font-medium ${asset.isSold ? 'text-muted-foreground line-through' : ''}`}>
                    {asset.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    S/ {Number(asset.estimatedValue).toFixed(2)}
                    {asset.maxSaleTimeDays !== null && ` · hasta ${asset.maxSaleTimeDays} días para vender`}
                  </p>
                  {asset.notes && <p className="text-sm text-muted-foreground">{asset.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={asset.isSold}
                      onCheckedChange={(checked) =>
                        updateAsset.mutate({ id: asset.id, input: { isSold: checked === true } })
                      }
                    />
                    Vendido
                  </label>
                  <AssetFormDialog
                    asset={asset}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar activo">
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton
                    aria-label="Eliminar activo"
                    description="Este activo se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteAsset.mutate(asset.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
