'use client';

import {
  createRecurringRuleSchema,
  RecurrenceFrequency,
  TransactionType,
  type CreateRecurringRuleInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useCreateRecurringRule,
  useDeleteRecurringRule,
  useRecurringRules,
  useUpdateRecurringRule,
} from '@/hooks/use-recurring-rules';
import { QueryError } from '@/components/query-error';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  CUSTOM: 'Cada N días',
};

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toUtcDate(v: string) {
  return new Date(`${v}T00:00:00Z`);
}

export default function RecurringRulesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: rules, isLoading, isError } = useRecurringRules();
  const createRule = useCreateRecurringRule();
  const updateRule = useUpdateRecurringRule();
  const deleteRule = useDeleteRecurringRule();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories?.map((c) => [c.id, c.name]));

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecurringRuleInput>({
    resolver: zodResolver(createRecurringRuleSchema),
    defaultValues: { type: TransactionType.EXPENSE, frequency: RecurrenceFrequency.MONTHLY, interval: 1 },
  });

  const frequency = watch('frequency');

  const onSubmit = async (values: CreateRecurringRuleInput) => {
    await createRule.mutateAsync(values);
    reset({ type: TransactionType.EXPENSE, frequency: RecurrenceFrequency.MONTHLY, interval: 1 });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Gastos programados</h1>
        <p className="text-gray-600">
          Reglas recurrentes que generan movimientos automáticamente (arriendo, suscripciones,
          etc.).
        </p>
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
          <label className="text-sm font-medium">Tipo</label>
          <select className="rounded border px-3 py-2" {...register('type')}>
            <option value={TransactionType.EXPENSE}>Egreso</option>
            <option value={TransactionType.INCOME}>Ingreso</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Cuenta</label>
          <select className="rounded border px-3 py-2" {...register('accountId')}>
            <option value="">Selecciona</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {errors.accountId && <p className="text-sm text-red-600">{errors.accountId.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Categoría</label>
          <select className="max-w-[220px] rounded border px-3 py-2" {...register('categoryId')}>
            <option value="">Selecciona</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.groupName} / {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-sm text-red-600">{errors.categoryId.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Monto</label>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded border px-3 py-2"
            {...register('amount')}
          />
          {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Frecuencia</label>
          <select className="rounded border px-3 py-2" {...register('frequency')}>
            {Object.values(RecurrenceFrequency).map((freq) => (
              <option key={freq} value={freq}>
                {FREQUENCY_LABELS[freq]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Cada</label>
          <input
            type="number"
            min={1}
            className="w-20 rounded border px-3 py-2"
            {...register('interval')}
          />
        </div>
        {frequency === RecurrenceFrequency.MONTHLY && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Día del mes</label>
            <input
              type="number"
              min={1}
              max={31}
              className="w-20 rounded border px-3 py-2"
              {...register('byMonthDay')}
            />
            {errors.byMonthDay && (
              <p className="text-sm text-red-600">{errors.byMonthDay.message}</p>
            )}
          </div>
        )}
        {frequency === RecurrenceFrequency.WEEKLY && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Día de la semana</label>
            <select className="rounded border px-3 py-2" {...register('byWeekday')}>
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            {errors.byWeekday && (
              <p className="text-sm text-red-600">{errors.byWeekday.message}</p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Desde</label>
          <input
            type="date"
            className="rounded border px-3 py-2"
            {...register('startDate', { setValueAs: (v: string) => (v ? toUtcDate(v) : undefined) })}
          />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate.message}</p>
          )}
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
          Crear regla
        </button>
        {createRule.isError && (
          <p className="w-full text-sm text-red-600">{createRule.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus gastos programados." />}

      <ul className="flex flex-col divide-y rounded border">
        {rules?.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">
                {rule.name}{' '}
                <span className="text-sm text-gray-500">
                  ({rule.type === 'INCOME' ? '+' : '-'}S/ {Number(rule.amount).toFixed(2)} ·{' '}
                  {FREQUENCY_LABELS[rule.frequency]})
                </span>
              </p>
              <p className="text-sm text-gray-600">
                {accountById.get(rule.accountId) ?? '—'} · {categoryById.get(rule.categoryId) ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={(e) =>
                    updateRule.mutate({ id: rule.id, input: { isActive: e.target.checked } })
                  }
                />
                Activa
              </label>
              <button
                type="button"
                onClick={() => deleteRule.mutate(rule.id)}
                className="text-sm text-red-600 underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {rules?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-600">Aún no tienes gastos programados.</li>
        )}
      </ul>
    </div>
  );
}
