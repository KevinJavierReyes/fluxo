'use client';

import { AccountType, createAccountSchema, type CreateAccountInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/use-accounts';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    control,
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
      <PageHeader title="Cuentas" description="Bancos, efectivo y tarjetas donde registras tus movimientos." />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type" className="w-40">
                      <SelectValue>{(value: AccountType) => ACCOUNT_TYPE_LABELS[value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AccountType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {ACCOUNT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="openingBalance">Saldo inicial</Label>
              <Input id="openingBalance" type="number" step="0.01" className="w-32" {...register('openingBalance')} />
              {errors.openingBalance && (
                <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Agregar cuenta
            </Button>
            {createAccount.isError && (
              <p className="w-full text-sm text-destructive">{createAccount.error.message}</p>
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
      {isError && <QueryError message="No se pudieron cargar tus cuentas." />}

      {accounts && accounts.length === 0 && <EmptyState message="Aún no tienes cuentas." />}

      {accounts && accounts.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3 first:pt-4 last:pb-4">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{account.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Saldo inicial S/ {Number(account.openingBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
                <ConfirmDeleteButton
                  aria-label="Eliminar cuenta"
                  description="Esta cuenta se eliminará de forma permanente. Esta acción no se puede deshacer."
                  onConfirm={() => deleteAccount.mutate(account.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
