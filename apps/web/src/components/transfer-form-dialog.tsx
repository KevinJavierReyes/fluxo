'use client';

import { useState, type ReactElement } from 'react';
import { createTransferSchema, type CreateTransferInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { es } from 'react-day-picker/locale';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateTransfer } from '@/hooks/use-transfers';
import { dateToUtcMidnight, todayUtc, utcMidnightToLocalDate } from '@/lib/date-range';
import { FormDialog } from '@/components/form-dialog';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Un id nuevo por apertura del modal: si el submit se reintenta, el backend no duplica.
function defaults(): CreateTransferInput {
  return {
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    date: todayUtc(),
    description: undefined,
    clientRequestId: crypto.randomUUID(),
  };
}

/**
 * Mover plata entre dos cuentas propias (p. ej. pagar una tarjeta desde el banco).
 * No cuenta como ingreso ni gasto: solo cambia el saldo de cada cuenta.
 */
export function TransferFormDialog({ trigger }: { trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const createTransfer = useCreateTransfer();
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: defaults(),
  });

  const fromAccountId = useWatch({ control, name: 'fromAccountId' });
  const toAccountId = useWatch({ control, name: 'toAccountId' });

  const onSubmit = handleSubmit(async (values) => {
    await createTransfer.mutateAsync(values);
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !open) {
          createTransfer.reset();
          reset(defaults());
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Nueva transferencia
          </Button>
        )
      }
      title="Nueva transferencia"
      description="Mueve plata entre tus cuentas, por ejemplo para pagar una tarjeta. No cuenta como gasto."
      onSubmit={onSubmit}
      submitLabel="Transferir"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={createTransfer.isError ? createTransfer.error.message : null}
    >
      <FormField label="Desde" error={errors.fromAccountId?.message}>
        <Controller
          name="fromAccountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.fromAccountId}>
                <SelectValue placeholder="Cuenta de origen">
                  {(value: string) => accountById.get(value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  ?.filter((account) => account.id !== toAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField label="Hacia" error={errors.toAccountId?.message}>
        <Controller
          name="toAccountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.toAccountId}>
                <SelectValue placeholder="Cuenta de destino">
                  {(value: string) => accountById.get(value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  ?.filter((account) => account.id !== fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
        <Input
          placeholder="Ej. Pago de tarjeta de septiembre"
          aria-invalid={!!errors.description}
          {...register('description', { setValueAs: (v) => (v === '' ? undefined : v) })}
        />
      </FormField>
    </FormDialog>
  );
}
