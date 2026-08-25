'use client';

import { createSavingsGoalSchema, type CreateSavingsGoalInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useContributeSavingsGoal,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useSavingsGoals,
} from '@/hooks/use-savings-goals';
import { QueryError } from '@/components/query-error';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ContributeRow({ goalId }: { goalId: string }) {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const contribute = useContributeSavingsGoal();

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <input
        type="number"
        step="0.01"
        placeholder="Monto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 rounded border px-2 py-1 text-sm"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={!accountId || !amount || contribute.isPending}
        onClick={() =>
          contribute.mutate({
            id: goalId,
            input: {
              accountId,
              amount: Number(amount),
              date: new Date(`${date}T00:00:00Z`),
            },
          })
        }
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        Aportar
      </button>
      {contribute.isError && <p className="text-sm text-red-600">{contribute.error.message}</p>}
    </div>
  );
}

export default function SavingsGoalsPage() {
  const { data: goals, isLoading, isError } = useSavingsGoals();
  const createGoal = useCreateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSavingsGoalInput>({
    resolver: zodResolver(createSavingsGoalSchema),
  });

  const onSubmit = async (values: CreateSavingsGoalInput) => {
    await createGoal.mutateAsync(values);
    reset({ name: '', targetAmount: undefined, targetDate: undefined });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Metas de ahorro</h1>
        <p className="text-gray-600">Define un objetivo y ve tu avance en tiempo real.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nombre</label>
          <input className="rounded border px-3 py-2" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Monto objetivo</label>
          <input
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('targetAmount')}
          />
          {errors.targetAmount && (
            <p className="text-sm text-red-600">{errors.targetAmount.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Fecha límite (opcional)</label>
          <input
            type="date"
            className="rounded border px-3 py-2"
            {...register('targetDate', {
              setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
            })}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Crear meta
        </button>
        {createGoal.isError && (
          <p className="w-full text-sm text-red-600">{createGoal.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus metas de ahorro." />}

      <ul className="flex flex-col gap-4">
        {goals?.map((goal) => {
          const target = Number(goal.targetAmount);
          const percent = target > 0 ? Math.min(100, (goal.progress / target) * 100) : 0;
          return (
            <li key={goal.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{goal.name}</p>
                  <p className="text-sm text-gray-600">
                    S/ {goal.progress.toFixed(2)} de S/ {target.toFixed(2)}
                    {goal.targetDate &&
                      ` · antes del ${new Date(goal.targetDate).toLocaleDateString('es-PE', { timeZone: 'UTC' })}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGoal.mutate(goal.id)}
                  className="text-sm text-red-600 underline"
                >
                  Eliminar
                </button>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
                <div className="h-full bg-black" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-3">
                <ContributeRow goalId={goal.id} />
              </div>
            </li>
          );
        })}
        {goals?.length === 0 && (
          <li className="rounded border px-4 py-3 text-sm text-gray-600">
            Aún no tienes metas de ahorro.
          </li>
        )}
      </ul>
    </div>
  );
}
