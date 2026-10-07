'use client';

import { useState, type ReactElement } from 'react';
import { TransactionStatus } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { es } from 'react-day-picker/locale';
import { z } from 'zod';
import { useUpdateTransaction } from '@/hooks/use-transactions';
import type { Account, Transaction } from '@/lib/types';
import { dateToUtcMidnight, todayUtc, utcMidnightToLocalDate } from '@/lib/date-range';
import { FormDialog } from '@/components/form-dialog';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const confirmSchema = z.object({
  accountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
});
type ConfirmValues = z.infer<typeof confirmSchema>;

/** Una PENDING vencida propone su fecha original; una futura (pagada antes) propone hoy. */
function defaultsFor(transaction: Transaction): ConfirmValues {
  const original = new Date(transaction.date);
  const today = todayUtc();
  return {
    accountId: transaction.accountId,
    amount: transaction.amount,
    date: original.getTime() > today.getTime() ? today : original,
  };
}

/**
 * Confirma una transacción proyectada (PENDING): permite ajustar la fecha real,
 * el monto y la cuenta. La fecha no puede ser futura: confirmar significa que ya ocurrió.
 */
export function ConfirmTransactionDialog({
  transaction,
  accounts,
  trigger,
}: {
  transaction: Transaction;
  accounts: Account[] | undefined;
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: defaultsFor(transaction),
  });

  const onSubmit = handleSubmit(async (values) => {
    await updateTransaction.mutateAsync({
      id: transaction.id,
      input: { ...values, status: TransactionStatus.CONFIRMED },
    });
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
      title="Confirmar transacción"
      description="Ajusta la fecha, el monto o la cuenta si lo que pasó fue distinto a lo proyectado."
      onSubmit={onSubmit}
      submitLabel="Confirmar"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={updateTransaction.isError ? updateTransaction.error.message : null}
    >
      <FormField label="Fecha en que ocurrió" error={errors.date?.message}>
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
                  disabled={{ after: utcMidnightToLocalDate(todayUtc()) }}
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
      <FormField label="Monto" error={errors.amount?.message}>
        <Input type="number" step="0.01" aria-invalid={!!errors.amount} {...register('amount')} />
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
    </FormDialog>
  );
}
