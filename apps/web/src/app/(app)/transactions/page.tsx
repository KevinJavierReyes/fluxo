'use client';

import { useEffect, useMemo, useState } from 'react';
import { createTransactionSchema, TransactionType, type CreateTransactionInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { es } from 'react-day-picker/locale';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCreateTransaction, useDeleteTransaction, useTransactions } from '@/hooks/use-transactions';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

function dateToUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function utcMidnightToLocalDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function FormField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label>{label}</Label>
      {children}
      <p className="min-h-5 text-sm text-destructive">{error ?? ' '}</p>
    </div>
  );
}

export default function TransactionsPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: transactions, isLoading, isError } = useTransactions();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const categories = useMemo(
    () =>
      groups?.flatMap((group) =>
        group.categories.map((category) => ({ ...category, groupName: group.name })),
      ),
    [groups],
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories?.map((c) => [c.id, c.name]));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      accountId: '',
      categoryId: '',
      date: dateToUtcMidnight(new Date()),
    },
  });

  useEffect(() => {
    if (accounts && accounts.length > 0 && !getValues('accountId')) {
      setValue('accountId', accounts[0].id);
    }
  }, [accounts, getValues, setValue]);

  useEffect(() => {
    if (categories && categories.length > 0 && !getValues('categoryId')) {
      setValue('categoryId', categories[0].id);
    }
  }, [categories, getValues, setValue]);

  const onSubmit = async (values: CreateTransactionInput) => {
    await createTransaction.mutateAsync(values);
    reset({
      type: TransactionType.EXPENSE,
      accountId: values.accountId,
      categoryId: categories?.[0]?.id ?? '',
      date: dateToUtcMidnight(new Date()),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Transacciones" description="Registra ingresos y egresos, incluso a futuro." />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <FormField label="Tipo">
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
            </FormField>
            <FormField label="Cuenta" error={errors.accountId?.message}>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-40" aria-invalid={!!errors.accountId}>
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
            </FormField>
            <FormField label="Categoría" error={errors.categoryId?.message}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-52" aria-invalid={!!errors.categoryId}>
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
            </FormField>
            <FormField label="Monto" error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                className="w-28"
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
            </FormField>
            <FormField label="Fecha" error={errors.date?.message}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-36 justify-start font-normal"
                          aria-invalid={!!errors.date}
                        />
                      }
                    >
                      <CalendarIcon className="text-muted-foreground" />
                      {field.value
                        ? field.value.toLocaleDateString('es-PE', { timeZone: 'UTC' })
                        : 'Selecciona'}
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <Calendar
                        mode="single"
                        locale={es}
                        selected={field.value ? utcMidnightToLocalDate(field.value) : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          field.onChange(dateToUtcMidnight(date));
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </FormField>
            <FormField label="Descripción" error={errors.description?.message} className="min-w-[220px] flex-1">
              <Input aria-invalid={!!errors.description} {...register('description')} />
            </FormField>
            <div className="flex flex-col gap-1.5">
              <Label className="invisible">Acción</Label>
              <Button type="submit" disabled={isSubmitting}>
                <PlusIcon />
                Registrar
              </Button>
              <p className="min-h-5" aria-hidden="true" />
            </div>
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
                  <TableHead className="pl-4">Fecha</TableHead>
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
                    <TableCell className="pl-4">
                      {new Date(tx.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}
                    </TableCell>
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
                      <ConfirmDeleteButton
                        aria-label="Eliminar transacción"
                        description="Esta transacción se eliminará de forma permanente. Esta acción no se puede deshacer."
                        onConfirm={() => deleteTransaction.mutate(tx.id)}
                      />
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
