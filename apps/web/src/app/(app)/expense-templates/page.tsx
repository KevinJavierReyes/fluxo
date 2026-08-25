'use client';

import {
  createExpenseTemplateSchema,
  TransactionType,
  type CreateExpenseTemplateInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useApplyExpenseTemplate,
  useCreateExpenseTemplate,
  useDeleteExpenseTemplate,
  useExpenseTemplates,
} from '@/hooks/use-expense-templates';
import { QueryError } from '@/components/query-error';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ApplyRow({ templateId }: { templateId: string }) {
  const [date, setDate] = useState(todayStr());
  const applyTemplate = useApplyExpenseTemplate();

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={() =>
          applyTemplate.mutate({
            id: templateId,
            input: { date: new Date(`${date}T00:00:00Z`) },
          })
        }
        disabled={applyTemplate.isPending}
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        Aplicar
      </button>
    </div>
  );
}

export default function ExpenseTemplatesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: templates, isLoading, isError } = useExpenseTemplates();
  const createTemplate = useCreateExpenseTemplate();
  const deleteTemplate = useDeleteExpenseTemplate();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories?.map((c) => [c.id, c.name]));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseTemplateInput>({
    resolver: zodResolver(createExpenseTemplateSchema),
    defaultValues: { type: TransactionType.EXPENSE },
  });

  const onSubmit = async (values: CreateExpenseTemplateInput) => {
    await createTemplate.mutateAsync(values);
    reset({ type: TransactionType.EXPENSE });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Gastos frecuentes</h1>
        <p className="text-gray-600">
          Plantillas rápidas para registrar en un clic un gasto que repites seguido.
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
          <label className="text-sm font-medium">Cuenta por defecto</label>
          <select className="rounded border px-3 py-2" {...register('accountId')}>
            <option value="">Elegir al aplicar</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Monto sugerido</label>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded border px-3 py-2"
            {...register('suggestedAmount')}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Crear plantilla
        </button>
        {createTemplate.isError && (
          <p className="w-full text-sm text-red-600">{createTemplate.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus plantillas." />}

      <ul className="flex flex-col divide-y rounded border">
        {templates?.map((template) => (
          <li key={template.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{template.name}</p>
              <p className="text-sm text-gray-600">
                {categoryById.get(template.categoryId) ?? '—'}
                {template.accountId ? ` · ${accountById.get(template.accountId)}` : ''}
                {template.suggestedAmount ? ` · S/ ${Number(template.suggestedAmount).toFixed(2)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ApplyRow templateId={template.id} />
              <button
                type="button"
                onClick={() => deleteTemplate.mutate(template.id)}
                className="text-sm text-red-600 underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {templates?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-600">Aún no tienes plantillas.</li>
        )}
      </ul>
    </div>
  );
}
