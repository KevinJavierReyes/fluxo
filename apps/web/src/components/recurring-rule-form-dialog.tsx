'use client';

import { useState, type ReactElement } from 'react';
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
  RecurrenceFrequency,
  TransactionType,
  type CreateRecurringRuleInput,
  type UpdateRecurringRuleInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCreateRecurringRule, useUpdateRecurringRule } from '@/hooks/use-recurring-rules';
import { FormDialog } from '@/components/form-dialog';
import { CategorySelect } from '@/components/category-select';
import { TransactionTypeSelect } from '@/components/transaction-type-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FREQUENCY_LABELS, WEEKDAY_LABELS } from '@/lib/recurrence';
import type { RecurringRule } from '@/lib/types';

function toUtcDate(v: string) {
  return new Date(`${v}T00:00:00Z`);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</p>;
}

function scheduleSummary(rule: RecurringRule): string {
  const parts = [
    rule.interval > 1 ? `${FREQUENCY_LABELS[rule.frequency]} (cada ${rule.interval})` : FREQUENCY_LABELS[rule.frequency],
  ];
  if (rule.frequency === RecurrenceFrequency.MONTHLY && rule.byMonthDay) {
    parts.push(`día ${rule.byMonthDay}`);
  }
  if (rule.frequency === RecurrenceFrequency.WEEKLY && rule.byWeekday !== null) {
    parts.push(WEEKDAY_LABELS[rule.byWeekday]);
  }
  parts.push(`desde ${new Date(rule.startDate).toLocaleDateString('es-PE', { timeZone: 'UTC' })}`);
  return parts.join(' · ');
}

/**
 * Crear o editar un gasto programado en un modal. El API solo permite editar nombre,
 * cuenta, categoría, monto y descripción (`updateRecurringRuleSchema` no acepta cambiar
 * tipo, frecuencia, intervalo, día ni fecha de inicio), así que create y edit son dos
 * formularios distintos con su propio schema.
 */
export function RecurringRuleFormDialog({
  rule,
  trigger,
}: {
  rule?: RecurringRule;
  trigger?: ReactElement;
}) {
  return rule ? (
    <EditRecurringRuleDialog rule={rule} trigger={trigger} />
  ) : (
    <CreateRecurringRuleDialog trigger={trigger} />
  );
}

function CreateRecurringRuleDialog({ trigger }: { trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const createRule = useCreateRecurringRule();
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));

  const defaultValues: Partial<CreateRecurringRuleInput> = {
    type: TransactionType.EXPENSE,
    frequency: RecurrenceFrequency.MONTHLY,
    interval: 1,
    accountId: '',
    categoryId: '',
    name: '',
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateRecurringRuleInput>({
    resolver: zodResolver(createRecurringRuleSchema),
    defaultValues,
  });

  const frequency = useWatch({ control, name: 'frequency' });

  const onSubmit = handleSubmit(async (values) => {
    await createRule.mutateAsync(values);
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !open) {
          createRule.reset();
          reset(defaultValues);
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Nueva regla
          </Button>
        )
      }
      title="Nuevo gasto programado"
      description="Regla recurrente que genera movimientos automáticamente (arriendo, suscripciones, etc.)."
      onSubmit={onSubmit}
      submitLabel="Crear regla"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      size="lg"
      error={createRule.isError ? createRule.error.message : null}
    >
      <SectionLabel>Qué</SectionLabel>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-name">Nombre</Label>
        <Input id="rule-name" placeholder="Ej. Arriendo, Netflix" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-type">Tipo</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TransactionTypeSelect value={field.value} onValueChange={field.onChange} triggerClassName="w-full" />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-amount">Monto</Label>
          <Input id="rule-amount" type="number" step="0.01" aria-invalid={!!errors.amount} {...register('amount')} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-account">Cuenta</Label>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? '')}>
                <SelectTrigger id="rule-account" className="w-full" aria-invalid={!!errors.accountId}>
                  <SelectValue placeholder="Selecciona">{(value: string) => accountById.get(value)}</SelectValue>
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
          <Label htmlFor="rule-category">Categoría</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <CategorySelect
                groups={groups}
                value={field.value}
                onValueChange={field.onChange}
                triggerClassName="w-full"
                ariaInvalid={!!errors.categoryId}
              />
            )}
          />
          {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
        </div>
      </div>

      <Separator />
      <SectionLabel>Cuándo</SectionLabel>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-frequency">Frecuencia</Label>
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="rule-frequency" className="w-full">
                  <SelectValue>{(value: RecurrenceFrequency) => FREQUENCY_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RecurrenceFrequency).map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {FREQUENCY_LABELS[freq]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-interval">Cada</Label>
          <Input id="rule-interval" type="number" min={1} {...register('interval')} />
        </div>
      </div>

      {frequency === RecurrenceFrequency.MONTHLY && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-by-month-day">Día del mes</Label>
          <Input
            id="rule-by-month-day"
            type="number"
            min={1}
            max={31}
            aria-invalid={!!errors.byMonthDay}
            {...register('byMonthDay')}
          />
          {errors.byMonthDay && <p className="text-sm text-destructive">{errors.byMonthDay.message}</p>}
        </div>
      )}

      {frequency === RecurrenceFrequency.WEEKLY && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-by-weekday">Día de la semana</Label>
          <Controller
            name="byWeekday"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value !== undefined ? String(field.value) : undefined}
                onValueChange={(v) => field.onChange(v !== null ? Number(v) : undefined)}
              >
                <SelectTrigger id="rule-by-weekday" className="w-full">
                  <SelectValue>{(value: string) => WEEKDAY_LABELS[Number(value)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.byWeekday && <p className="text-sm text-destructive">{errors.byWeekday.message}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-start-date">Desde</Label>
        <Input
          id="rule-start-date"
          type="date"
          aria-invalid={!!errors.startDate}
          {...register('startDate', { setValueAs: (v: string) => (v ? toUtcDate(v) : undefined) })}
        />
        {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-description">Descripción</Label>
        <Input id="rule-description" {...register('description')} />
      </div>
    </FormDialog>
  );
}

function EditRecurringRuleDialog({ rule, trigger }: { rule: RecurringRule; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const updateRule = useUpdateRecurringRule();
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));

  const defaultValues: UpdateRecurringRuleInput = {
    name: rule.name,
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    amount: Number(rule.amount),
    description: rule.description ?? undefined,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateRecurringRuleInput>({
    resolver: zodResolver(updateRecurringRuleSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    await updateRule.mutateAsync({ id: rule.id, input: values });
    setOpen(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !open) {
          updateRule.reset();
          reset(defaultValues);
        }
      }}
      trigger={trigger}
      title="Editar gasto programado"
      description="El tipo, la frecuencia y la fecha de inicio no se pueden cambiar; crea una nueva regla si necesitas otro calendario."
      onSubmit={onSubmit}
      submitLabel="Guardar cambios"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      size="lg"
      error={updateRule.isError ? updateRule.error.message : null}
    >
      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {scheduleSummary(rule)}
      </div>

      <Alert variant="warning">
        <AlertDescription>
          Editar esta regla no modifica las transacciones que ya se generaron. Los cambios (monto, cuenta, categoría,
          nombre) solo aplican a las próximas transacciones que se generen hacia adelante.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-edit-name">Nombre</Label>
        <Input id="rule-edit-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-edit-account">Cuenta</Label>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? '')}>
                <SelectTrigger id="rule-edit-account" className="w-full">
                  <SelectValue placeholder="Selecciona">{(value: string) => accountById.get(value)}</SelectValue>
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
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-edit-amount">Monto</Label>
          <Input id="rule-edit-amount" type="number" step="0.01" aria-invalid={!!errors.amount} {...register('amount')} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-edit-category">Categoría</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelect
              groups={groups}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              triggerClassName="w-full"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-edit-description">Descripción</Label>
        <Input id="rule-edit-description" {...register('description')} />
      </div>
    </FormDialog>
  );
}
