'use client';

import { createObligationSchema, type CreateObligationInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useCreateObligation,
  useDeleteObligation,
  useLinkObligationRecurring,
  useObligations,
  useUpdateObligation,
} from '@/hooks/use-obligations';
import { QueryError } from '@/components/query-error';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function LinkRecurringRow({ obligationId }: { obligationId: string }) {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [byMonthDay, setByMonthDay] = useState('1');
  const [startDate, setStartDate] = useState(todayStr());
  const linkRecurring = useLinkObligationRecurring();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2">
      <span className="text-sm text-gray-600">Automatizar pago:</span>
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="">Cuenta</option>
        {accounts?.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="max-w-[200px] rounded border px-2 py-1 text-sm"
      >
        <option value="">Categoría</option>
        {categories?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.groupName} / {category.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={31}
        value={byMonthDay}
        onChange={(e) => setByMonthDay(e.target.value)}
        className="w-16 rounded border px-2 py-1 text-sm"
        title="Día del mes"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={!accountId || !categoryId || linkRecurring.isPending}
        onClick={() =>
          linkRecurring.mutate({
            id: obligationId,
            input: {
              accountId,
              categoryId,
              byMonthDay: Number(byMonthDay),
              startDate: new Date(`${startDate}T00:00:00Z`),
            },
          })
        }
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        Vincular
      </button>
      {linkRecurring.isError && (
        <p className="w-full text-sm text-red-600">{linkRecurring.error.message}</p>
      )}
    </div>
  );
}

export default function ObligationsPage() {
  const { data: obligations, isLoading, isError } = useObligations();
  const createObligation = useCreateObligation();
  const updateObligation = useUpdateObligation();
  const deleteObligation = useDeleteObligation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateObligationInput>({
    resolver: zodResolver(createObligationSchema),
  });

  const onSubmit = async (values: CreateObligationInput) => {
    await createObligation.mutateAsync(values);
    reset({});
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Obligaciones</h1>
        <p className="text-gray-600">
          Todas tus deudas en un solo lugar, para priorizar cuál atacar primero.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">¿A quién le debes?</label>
          <input className="rounded border px-3 py-2" {...register('creditorName')} />
          {errors.creditorName && (
            <p className="text-sm text-red-600">{errors.creditorName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">¿Cuánto falta por pagar?</label>
          <input
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('totalAmount')}
          />
          {errors.totalAmount && (
            <p className="text-sm text-red-600">{errors.totalAmount.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">¿Cuánto pagas al mes?</label>
          <input
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('monthlyPayment')}
          />
          {errors.monthlyPayment && (
            <p className="text-sm text-red-600">{errors.monthlyPayment.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Meses restantes</label>
          <input
            type="number"
            min={0}
            className="w-24 rounded border px-3 py-2"
            {...register('remainingMonths')}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tasa (%)</label>
          <input
            type="number"
            step="0.01"
            className="w-24 rounded border px-3 py-2"
            {...register('interestRate')}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Descripción</label>
          <input className="rounded border px-3 py-2" {...register('description')} />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Agregar obligación
        </button>
        {createObligation.isError && (
          <p className="w-full text-sm text-red-600">{createObligation.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus obligaciones." />}

      <ul className="flex flex-col gap-4">
        {obligations?.map((obligation) => (
          <li key={obligation.id} className="rounded border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${obligation.isPaidOff ? 'line-through text-gray-400' : ''}`}>
                  {obligation.creditorName}
                </p>
                <p className="text-sm text-gray-600">
                  Falta S/ {Number(obligation.totalAmount).toFixed(2)} · S/{' '}
                  {Number(obligation.monthlyPayment).toFixed(2)}/mes
                  {obligation.remainingMonths !== null && ` · ${obligation.remainingMonths} meses`}
                  {obligation.interestRate !== null && ` · ${Number(obligation.interestRate).toFixed(2)}% tasa`}
                </p>
                {obligation.description && (
                  <p className="text-sm text-gray-500">{obligation.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={obligation.isPaidOff}
                    onChange={(e) =>
                      updateObligation.mutate({
                        id: obligation.id,
                        input: { isPaidOff: e.target.checked },
                      })
                    }
                  />
                  Pagada
                </label>
                <button
                  type="button"
                  onClick={() => deleteObligation.mutate(obligation.id)}
                  className="text-sm text-red-600 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
            {obligation.linkedRecurringRuleId ? (
              <p className="mt-2 border-t pt-2 text-sm text-green-700">
                Pago automático vinculado.
              </p>
            ) : (
              <LinkRecurringRow obligationId={obligation.id} />
            )}
          </li>
        ))}
        {obligations?.length === 0 && (
          <li className="rounded border px-4 py-3 text-sm text-gray-600">
            Aún no tienes obligaciones registradas.
          </li>
        )}
      </ul>
    </div>
  );
}
