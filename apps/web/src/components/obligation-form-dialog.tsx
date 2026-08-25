'use client';

import { useState, type ReactElement } from 'react';
import { createObligationSchema, type CreateObligationInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useCreateObligation, useUpdateObligation } from '@/hooks/use-obligations';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Obligation } from '@/lib/types';

function defaultsFor(obligation?: Obligation): CreateObligationInput {
  return obligation
    ? {
        creditorName: obligation.creditorName,
        totalAmount: Number(obligation.totalAmount),
        monthlyPayment: Number(obligation.monthlyPayment),
        remainingMonths: obligation.remainingMonths ?? undefined,
        interestRate: obligation.interestRate ? Number(obligation.interestRate) : undefined,
        description: obligation.description ?? undefined,
      }
    : {
        creditorName: '',
        totalAmount: 0,
        monthlyPayment: 0,
        remainingMonths: undefined,
        interestRate: undefined,
        description: undefined,
      };
}

/**
 * Crear o editar una obligación en un modal. Si viene `obligation`, edita esa obligación.
 */
export function ObligationFormDialog({
  obligation,
  trigger,
}: {
  obligation?: Obligation;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const createObligation = useCreateObligation();
  const updateObligation = useUpdateObligation();
  const isEdit = Boolean(obligation);
  const mutation = isEdit ? updateObligation : createObligation;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateObligationInput>({
    resolver: zodResolver(createObligationSchema),
    defaultValues: defaultsFor(obligation),
  });

  // Los inputs number nativos entregan string hasta que zod los coacciona en el submit;
  // para el cálculo en vivo hay que convertir explícitamente.
  const totalAmount = Number(useWatch({ control, name: 'totalAmount' })) || 0;
  const monthlyPayment = Number(useWatch({ control, name: 'monthlyPayment' })) || 0;
  const computedMonths =
    totalAmount > 0 && monthlyPayment > 0 ? Math.ceil(totalAmount / monthlyPayment) : null;

  const onSubmit = handleSubmit(async (values) => {
    if (obligation) {
      await updateObligation.mutateAsync({ id: obligation.id, input: values });
    } else {
      await createObligation.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !open) {
          mutation.reset();
          reset(defaultsFor(obligation));
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Agregar obligación
          </Button>
        )
      }
      title={isEdit ? 'Editar obligación' : 'Nueva obligación'}
      description={
        isEdit
          ? 'Actualiza los datos de esta obligación.'
          : 'Todas tus deudas en un solo lugar, para priorizar cuál atacar primero.'
      }
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Agregar obligación'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      size="lg"
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="obligation-creditor-name">¿A quién le debes?</Label>
        <Input
          id="obligation-creditor-name"
          placeholder="Ej. Banco, tarjeta, prestamista"
          aria-invalid={!!errors.creditorName}
          {...register('creditorName')}
        />
        {errors.creditorName && (
          <p className="text-sm text-destructive">{errors.creditorName.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="obligation-total-amount">¿Cuánto falta por pagar?</Label>
          <Input
            id="obligation-total-amount"
            type="number"
            step="0.01"
            aria-invalid={!!errors.totalAmount}
            {...register('totalAmount')}
          />
          {errors.totalAmount && (
            <p className="text-sm text-destructive">{errors.totalAmount.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="obligation-monthly-payment">¿Cuánto pagas al mes?</Label>
          <Input
            id="obligation-monthly-payment"
            type="number"
            step="0.01"
            aria-invalid={!!errors.monthlyPayment}
            {...register('monthlyPayment')}
          />
          {errors.monthlyPayment && (
            <p className="text-sm text-destructive">{errors.monthlyPayment.message}</p>
          )}
        </div>
      </div>

      {computedMonths !== null && (
        <p className="-mt-2 text-xs text-muted-foreground">
          ≈ {computedMonths} {computedMonths === 1 ? 'mes' : 'meses'} a S/ {monthlyPayment.toFixed(2)} · total S/{' '}
          {totalAmount.toFixed(2)}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="obligation-remaining-months">Meses restantes</Label>
          <Input
            id="obligation-remaining-months"
            type="number"
            min={0}
            {...register('remainingMonths', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="obligation-interest-rate">Tasa (%)</Label>
          <Input
            id="obligation-interest-rate"
            type="number"
            step="0.01"
            {...register('interestRate', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="obligation-description">Descripción</Label>
        <Input id="obligation-description" {...register('description')} />
      </div>
    </FormDialog>
  );
}
