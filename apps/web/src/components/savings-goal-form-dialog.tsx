'use client';

import { useState, type ReactElement } from 'react';
import { createSavingsGoalSchema, type CreateSavingsGoalInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { es } from 'react-day-picker/locale';
import { CalendarIcon, PlusIcon, XIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateSavingsGoal, useUpdateSavingsGoal } from '@/hooks/use-savings-goals';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dateToUtcMidnight, utcMidnightToLocalDate } from '@/lib/date-range';
import type { SavingsGoal } from '@/lib/types';

function defaultsFor(goal?: SavingsGoal): CreateSavingsGoalInput {
  return goal
    ? {
        name: goal.name,
        targetAmount: Number(goal.targetAmount),
        targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
      }
    : {
        name: '',
        targetAmount: 0,
        targetDate: undefined,
      };
}

/**
 * Crear o editar una meta de ahorro en un modal. Si viene `goal`, edita esa meta.
 */
export function SavingsGoalFormDialog({
  goal,
  trigger,
}: {
  goal?: SavingsGoal;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const isEdit = Boolean(goal);
  const mutation = isEdit ? updateGoal : createGoal;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateSavingsGoalInput>({
    resolver: zodResolver(createSavingsGoalSchema),
    defaultValues: defaultsFor(goal),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (goal) {
      await updateGoal.mutateAsync({ id: goal.id, input: values });
    } else {
      await createGoal.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Ver comentario equivalente en account-form-dialog.tsx: sin `!open`, un
        // onOpenChange(true) redundante resetearía el formulario innecesariamente.
        if (next && !open) {
          mutation.reset();
          reset(defaultsFor(goal));
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Nueva meta
          </Button>
        )
      }
      title={isEdit ? 'Editar meta' : 'Nueva meta de ahorro'}
      description={
        isEdit
          ? 'Actualiza el objetivo o la fecha límite de esta meta.'
          : 'Define un objetivo y ve tu avance en tiempo real.'
      }
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear meta'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="savings-goal-name">Nombre</Label>
        <Input
          id="savings-goal-name"
          placeholder="Ej. Fondo de emergencia"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="savings-goal-target-amount">Monto objetivo</Label>
        <Input
          id="savings-goal-target-amount"
          type="number"
          step="0.01"
          aria-invalid={!!errors.targetAmount}
          {...register('targetAmount')}
        />
        {errors.targetAmount && (
          <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Fecha límite (opcional)</Label>
        <Controller
          name="targetDate"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" className="w-full justify-start font-normal" />
                  }
                >
                  <CalendarIcon className="text-muted-foreground" />
                  {field.value
                    ? new Date(field.value).toLocaleDateString('es-PE', { timeZone: 'UTC' })
                    : 'Sin fecha límite'}
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={field.value ? utcMidnightToLocalDate(new Date(field.value)) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      field.onChange(dateToUtcMidnight(date));
                      setDatePickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {field.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar fecha límite"
                  onClick={() => field.onChange(undefined)}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          )}
        />
      </div>
    </FormDialog>
  );
}
