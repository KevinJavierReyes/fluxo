'use client';

import { createBudgetSchema, type CreateBudgetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useBudgetStatus, useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/use-budgets';
import { QueryError } from '@/components/query-error';

export default function BudgetsPage() {
  const { data: groups } = useCategoryGroups();
  const { data: budgets, isLoading, isError } = useBudgets();
  const { data: status } = useBudgetStatus();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const expenseGroups = groups?.filter((g) => g.type === 'EXPENSE');
  const groupById = new Map(groups?.map((g) => [g.id, g.name]));
  const statusByGroup = new Map(status?.map((s) => [s.categoryGroupId, s]));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
  });

  const onSubmit = async (values: CreateBudgetInput) => {
    await createBudget.mutateAsync(values);
    reset({ categoryGroupId: '', amount: undefined, effectiveFrom: undefined });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Presupuestos</h1>
        <p className="text-gray-600">Límite mensual de gasto por categoría, con seguimiento en vivo.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Grupo de categoría</label>
          <select className="rounded border px-3 py-2" {...register('categoryGroupId')}>
            <option value="">Selecciona</option>
            {expenseGroups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {errors.categoryGroupId && (
            <p className="text-sm text-red-600">{errors.categoryGroupId.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Límite mensual</label>
          <input
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('amount')}
          />
          {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Vigente desde</label>
          <input
            type="date"
            className="rounded border px-3 py-2"
            {...register('effectiveFrom', {
              setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
            })}
          />
          {errors.effectiveFrom && (
            <p className="text-sm text-red-600">{errors.effectiveFrom.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Crear presupuesto
        </button>
        {createBudget.isError && (
          <p className="w-full text-sm text-red-600">{createBudget.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus presupuestos." />}

      <ul className="flex flex-col gap-4">
        {budgets?.map((budget) => {
          const s = statusByGroup.get(budget.categoryGroupId);
          const percent = s ? Math.min(100, s.percentUsed) : 0;
          return (
            <li key={budget.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{groupById.get(budget.categoryGroupId) ?? '—'}</p>
                  <p className={`text-sm ${s?.isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                    {s
                      ? `S/ ${s.spentAmount.toFixed(2)} de S/ ${s.budgetAmount.toFixed(2)} este mes (${s.percentUsed.toFixed(0)}%)`
                      : `Límite S/ ${Number(budget.amount).toFixed(2)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBudget.mutate(budget.id)}
                  className="text-sm text-red-600 underline"
                >
                  Eliminar
                </button>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className={`h-full ${s?.isOverBudget ? 'bg-red-600' : 'bg-black'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
        {budgets?.length === 0 && (
          <li className="rounded border px-4 py-3 text-sm text-gray-600">
            Aún no tienes presupuestos.
          </li>
        )}
      </ul>
    </div>
  );
}
