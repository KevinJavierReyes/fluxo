'use client';

import { createTransactionSchema, TransactionType, type CreateTransactionInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCreateTransaction, useDeleteTransaction, useTransactions } from '@/hooks/use-transactions';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      accountId: '',
      categoryId: '',
    },
  });

  const onSubmit = async (values: CreateTransactionInput) => {
    await createTransaction.mutateAsync(values);
    reset({ type: TransactionType.EXPENSE, accountId: values.accountId, categoryId: '' });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Transacciones" description="Registra ingresos y egresos, incluso a futuro." />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        {(value: TransactionType) => (value === TransactionType.INCOME ? 'Ingreso' : 'Egreso')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TransactionType.EXPENSE}>Egreso</SelectItem>
                      <SelectItem value={TransactionType.INCOME}>Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cuenta</Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Selecciona">
                        {(value: string) => accountById.get(value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoría</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Selecciona">
                        {(value: string) => categoryById.get(value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.groupName} / {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Monto</Label>
              <Input type="number" step="0.01" className="w-28" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                {...register('date', {
                  setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
                })}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descripción</Label>
              <Input {...register('description')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Registrar
            </Button>
            {createTransaction.isError && (
              <p className="w-full text-sm text-destructive">{createTransaction.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <QueryError message="No se pudieron cargar tus transacciones." />}

      {transactions && transactions.length === 0 && <EmptyState message="Aún no hay transacciones." />}

      {transactions && transactions.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'INCOME' ? 'default' : 'secondary'}>
                        {tx.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </TableCell>
                    <TableCell>{accountById.get(tx.accountId) ?? '—'}</TableCell>
                    <TableCell>{categoryById.get(tx.categoryId) ?? '—'}</TableCell>
                    <TableCell>{tx.description ?? '—'}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${tx.type === 'INCOME' ? 'text-success' : 'text-destructive'}`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}S/ {Number(tx.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Eliminar transacción"
                        onClick={() => deleteTransaction.mutate(tx.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
