'use client';

import { createAssetSchema, type CreateAssetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateAsset, useDeleteAsset, useAssets, useUpdateAsset } from '@/hooks/use-assets';
import { QueryError } from '@/components/query-error';

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
      <div>
        <h1 className="text-2xl font-semibold">Activos</h1>
        <p className="text-gray-600">
          Bienes que podrías convertir en efectivo si tu flujo de caja lo necesitara.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Activo</label>
          <input className="rounded border px-3 py-2" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">¿Cuánto me pagarían por él?</label>
          <input
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('estimatedValue')}
          />
          {errors.estimatedValue && (
            <p className="text-sm text-red-600">{errors.estimatedValue.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Días máximo para venderlo</label>
          <input
            type="number"
            min={0}
            className="w-32 rounded border px-3 py-2"
            {...register('maxSaleTimeDays')}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Observaciones</label>
          <input className="rounded border px-3 py-2" {...register('notes')} />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Agregar activo
        </button>
        {createAsset.isError && (
          <p className="w-full text-sm text-red-600">{createAsset.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus activos." />}

      <ul className="flex flex-col divide-y rounded border">
        {assets?.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={`font-medium ${asset.isSold ? 'text-gray-400 line-through' : ''}`}>
                {asset.name}
              </p>
              <p className="text-sm text-gray-600">
                S/ {Number(asset.estimatedValue).toFixed(2)}
                {asset.maxSaleTimeDays !== null && ` · hasta ${asset.maxSaleTimeDays} días para vender`}
              </p>
              {asset.notes && <p className="text-sm text-gray-500">{asset.notes}</p>}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={asset.isSold}
                  onChange={(e) =>
                    updateAsset.mutate({ id: asset.id, input: { isSold: e.target.checked } })
                  }
                />
                Vendido
              </label>
              <button
                type="button"
                onClick={() => deleteAsset.mutate(asset.id)}
                className="text-sm text-red-600 underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {assets?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-600">Aún no tienes activos registrados.</li>
        )}
      </ul>
    </div>
  );
}
