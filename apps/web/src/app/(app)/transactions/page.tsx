'use client';

import { createTransactionSchema, TransactionType, type CreateTransactionInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCreateTransaction, useDeleteTransaction, useTransactions } from '@/hooks/use-transactions';
import { QueryError } from '@/components/query-error';

export default function TransactionsPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: transactions, isLoading, isError } = useTransactions();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

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
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
    },
  });

  const onSubmit = async (values: CreateTransactionInput) => {
    await createTransaction.mutateAsync(values);
    reset({ type: TransactionType.EXPENSE, accountId: values.accountId });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Transacciones</h1>
        <p className="text-gray-600">Registra ingresos y egresos, incluso a futuro.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
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
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            className="rounded border px-3 py-2"
            {...register('date', {
              setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
            })}
          />
          {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
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
          Registrar
        </button>
        {createTransaction.isError && (
          <p className="w-full text-sm text-red-600">{createTransaction.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus transacciones." />}

      <div className="overflow-x-auto rounded border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Cuenta</th>
            <th className="px-3 py-2">Categoría</th>
            <th className="px-3 py-2">Descripción</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {transactions?.map((tx) => (
            <tr key={tx.id} className="border-b">
              <td className="px-3 py-2">
                {new Date(tx.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}
              </td>
              <td className="px-3 py-2">{tx.type === 'INCOME' ? 'Ingreso' : 'Egreso'}</td>
              <td className="px-3 py-2">{accountById.get(tx.accountId) ?? '—'}</td>
              <td className="px-3 py-2">{categoryById.get(tx.categoryId) ?? '—'}</td>
              <td className="px-3 py-2">{tx.description ?? '—'}</td>
              <td
                className={`px-3 py-2 text-right ${tx.type === 'INCOME' ? 'text-green-700' : 'text-red-700'}`}
              >
                {tx.type === 'INCOME' ? '+' : '-'}S/ {Number(tx.amount).toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => deleteTransaction.mutate(tx.id)}
                  className="text-red-600 underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {transactions?.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                Aún no hay transacciones.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
