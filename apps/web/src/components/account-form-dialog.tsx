'use client';

import { useState, type ReactElement } from 'react';
import {
  AccountType,
  createAccountSchema,
  type CreateAccountInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { es } from 'react-day-picker/locale';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateAccount, useUpdateAccount } from '@/hooks/use-accounts';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-type';
import { dateToUtcMidnight, utcMidnightToLocalDate } from '@/lib/date-range';
import type { Account } from '@/lib/types';

function defaultsFor(account?: Account): CreateAccountInput {
  return account
    ? {
        name: account.name,
        type: account.type,
        openingBalance: Number(account.openingBalance),
        openingBalanceDate: new Date(account.openingBalanceDate),
      }
    : {
        name: '',
        type: AccountType.BANK,
        openingBalance: 0,
        openingBalanceDate: dateToUtcMidnight(new Date()),
      };
}

/**
 * Crear o editar una cuenta en un modal. Reutilizable desde cualquier vista:
 * la página de Cuentas y el preview de wallets del dashboard usan el mismo.
 */
export function AccountFormDialog({
  account,
  trigger,
}: {
  /** Si viene, el modal edita esa cuenta; si no, crea una nueva. */
  account?: Account;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isEdit = Boolean(account);
  const mutation = isEdit ? updateAccount : createAccount;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: defaultsFor(account),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (account) {
      await updateAccount.mutateAsync({ id: account.id, input: values });
    } else {
      await createAccount.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          mutation.reset();
          reset(defaultsFor(account));
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Agregar cuenta
          </Button>
        )
      }
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      description={
        isEdit
          ? 'Actualiza los datos de esta cuenta.'
          : 'Bancos, efectivo o tarjetas donde registras tus movimientos.'
      }
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear cuenta'}
      isSubmitting={isSubmitting}
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-name">Nombre</Label>
        <Input
          id="account-name"
          placeholder="Ej. BCP Soles"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-type">Tipo</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? AccountType.BANK)}
              >
                <SelectTrigger id="account-type" className="w-full">
                  <SelectValue>
                    {(value: AccountType) => ACCOUNT_TYPE_LABELS[value]}
                  </SelectValue>
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
          <Label htmlFor="account-opening-balance">Saldo inicial</Label>
          <Input
            id="account-opening-balance"
            type="number"
            step="0.01"
            aria-invalid={!!errors.openingBalance}
            {...register('openingBalance')}
          />
          {errors.openingBalance && (
            <p className="text-sm text-destructive">
              {errors.openingBalance.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Fecha del saldo inicial</Label>
        <Controller
          name="openingBalanceDate"
          control={control}
          render={({ field }) => (
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                  />
                }
              >
                <CalendarIcon className="text-muted-foreground" />
                {field.value
                  ? new Date(field.value).toLocaleDateString('es-PE', {
                      timeZone: 'UTC',
                    })
                  : 'Selecciona'}
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  locale={es}
                  selected={
                    field.value
                      ? utcMidnightToLocalDate(new Date(field.value))
                      : undefined
                  }
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
        <p className="text-xs text-muted-foreground">
          Desde esta fecha se acumulan los movimientos sobre el saldo inicial.
        </p>
      </div>
    </FormDialog>
  );
}
