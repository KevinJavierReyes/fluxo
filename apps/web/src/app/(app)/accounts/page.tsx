'use client';

import { AccountType, createAccountSchema, type CreateAccountInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/use-accounts';
import { QueryError } from '@/components/query-error';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Banco',
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de crédito',
  OTHER: 'Otro',
};

export default function AccountsPage() {
  const { data: accounts, isLoading, isError } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { type: AccountType.BANK, openingBalance: 0 },
  });

  const onSubmit = async (values: CreateAccountInput) => {
    await createAccount.mutateAsync(values);
    reset({ name: '', type: AccountType.BANK, openingBalance: 0 });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas</h1>
        <p className="text-gray-600">Bancos, efectivo y tarjetas donde registras tus movimientos.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded border p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="name">
            Nombre
          </label>
          <input id="name" className="rounded border px-3 py-2" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="type">
            Tipo
          </label>
          <select id="type" className="rounded border px-3 py-2" {...register('type')}>
            {Object.values(AccountType).map((type) => (
              <option key={type} value={type}>
                {ACCOUNT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="openingBalance">
            Saldo inicial
          </label>
          <input
            id="openingBalance"
            type="number"
            step="0.01"
            className="w-32 rounded border px-3 py-2"
            {...register('openingBalance')}
          />
          {errors.openingBalance && (
            <p className="text-sm text-red-600">{errors.openingBalance.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Agregar cuenta
        </button>
        {createAccount.isError && (
          <p className="w-full text-sm text-red-600">{createAccount.error.message}</p>
        )}
      </form>

      {isLoading && <p>Cargando...</p>}
      {isError && <QueryError message="No se pudieron cargar tus cuentas." />}

      <ul className="flex flex-col divide-y rounded border">
        {accounts?.map((account) => (
          <li key={account.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-gray-600">
                {ACCOUNT_TYPE_LABELS[account.type]} · Saldo inicial S/{' '}
                {Number(account.openingBalance).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => deleteAccount.mutate(account.id)}
              className="text-sm text-red-600 underline"
            >
              Eliminar
            </button>
          </li>
        ))}
        {accounts?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-600">Aún no tienes cuentas.</li>
        )}
      </ul>
    </div>
  );
}
