'use client';

import { useState, type ReactElement } from 'react';
import { createTransactionSchema, type CreateTransactionInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { es } from 'react-day-picker/locale';
import { useUpdateTransaction } from '@/hooks/use-transactions';
import { useCategoryTypeSync } from '@/hooks/use-category-type-sync';
import type { Account, CategoryGroup, Transaction } from '@/lib/types';
import { dateToUtcMidnight, utcMidnightToLocalDate } from '@/lib/date-range';
import { FormDialog } from '@/components/form-dialog';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionTypeSelect } from '@/components/transaction-type-select';
import { CategorySelect } from '@/components/category-select';

function defaultsFor(transaction: Transaction): CreateTransactionInput {
  return {
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: transaction.amount,
    date: dateToUtcMidnight(new Date(transaction.date)),
    description: transaction.description ?? undefined,
  };
}

/** Modal para editar una transacción existente. La creación sigue siendo el form inline de la página. */
export function EditTransactionDialog({
  transaction,
  accounts,
  groups,
  trigger,
}: {
  transaction: Transaction;
  accounts: Account[] | undefined;
  groups: CategoryGroup[] | undefined;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const updateTransaction = useUpdateTransaction();
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: defaultsFor(transaction),
  });

  const type = useWatch({ control, name: 'type' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const handleCategoryChange = useCategoryTypeSync({ type, categoryId, groups, setValue });

  const onSubmit = handleSubmit(async (values) => {
    await updateTransaction.mutateAsync({ id: transaction.id, input: values });
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !open) {
          updateTransaction.reset();
          reset(defaultsFor(transaction));
        }
      }}
      trigger={trigger}
      title="Editar transacción"
      onSubmit={onSubmit}
      submitLabel="Guardar cambios"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={updateTransaction.isError ? updateTransaction.error.message : null}
    >
      <FormField label="Tipo">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <TransactionTypeSelect value={field.value} onValueChange={field.onChange} triggerClassName="w-full" />
          )}
        />
      </FormField>
      <FormField label="Cuenta" error={errors.accountId?.message}>
        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.accountId}>
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
            <CategorySelect
              groups={groups}
              type={type}
              value={field.value}
              onValueChange={(v) => handleCategoryChange(v, field.onChange)}
              triggerClassName="w-full"
              ariaInvalid={!!errors.categoryId}
            />
          )}
        />
      </FormField>
      <FormField label="Monto" error={errors.amount?.message}>
        <Input type="number" step="0.01" aria-invalid={!!errors.amount} {...register('amount')} />
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
                    className="w-full justify-start font-normal"
                    aria-invalid={!!errors.date}
                  />
                }
              >
                <CalendarIcon className="text-muted-foreground" />
                {field.value ? field.value.toLocaleDateString('es-PE', { timeZone: 'UTC' }) : 'Selecciona'}
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
      <FormField label="Descripción" error={errors.description?.message}>
        <Input aria-invalid={!!errors.description} {...register('description')} />
      </FormField>
    </FormDialog>
  );
}
