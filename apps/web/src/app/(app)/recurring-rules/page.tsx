'use client';

import {
  createRecurringRuleSchema,
  RecurrenceFrequency,
  TransactionType,
  type CreateRecurringRuleInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useCreateRecurringRule,
  useDeleteRecurringRule,
  useRecurringRules,
  useUpdateRecurringRule,
} from '@/hooks/use-recurring-rules';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  CUSTOM: 'Cada N días',
};

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toUtcDate(v: string) {
  return new Date(`${v}T00:00:00Z`);
}

export default function RecurringRulesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: rules, isLoading, isError } = useRecurringRules();
  const createRule = useCreateRecurringRule();
  const updateRule = useUpdateRecurringRule();
  const deleteRule = useDeleteRecurringRule();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories?.map((c) => [c.id, c.name]));

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecurringRuleInput>({
    resolver: zodResolver(createRecurringRuleSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      accountId: '',
      categoryId: '',
    },
  });

  const frequency = watch('frequency');

  const onSubmit = async (values: CreateRecurringRuleInput) => {
    await createRule.mutateAsync(values);
    reset({
      type: TransactionType.EXPENSE,
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      accountId: '',
      categoryId: '',
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gastos programados"
        description="Reglas recurrentes que generan movimientos automáticamente (arriendo, suscripciones, etc.)."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
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
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? '')}>
                    <SelectTrigger className="w-40">
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
              <Label>Categoría</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? '')}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Selecciona">{(value: string) => categoryById.get(value)}</SelectValue>
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
              <Label>Frecuencia</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-36">
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
              <Label>Cada</Label>
              <Input type="number" min={1} className="w-20" {...register('interval')} />
            </div>
            {frequency === RecurrenceFrequency.MONTHLY && (
              <div className="flex flex-col gap-1.5">
                <Label>Día del mes</Label>
                <Input type="number" min={1} max={31} className="w-20" {...register('byMonthDay')} />
                {errors.byMonthDay && <p className="text-sm text-destructive">{errors.byMonthDay.message}</p>}
              </div>
            )}
            {frequency === RecurrenceFrequency.WEEKLY && (
              <div className="flex flex-col gap-1.5">
                <Label>Día de la semana</Label>
                <Controller
                  name="byWeekday"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value !== undefined ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(v !== null ? Number(v) : undefined)}
                    >
                      <SelectTrigger className="w-36">
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
              <Label>Desde</Label>
              <Input
                type="date"
                {...register('startDate', { setValueAs: (v: string) => (v ? toUtcDate(v) : undefined) })}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descripción</Label>
              <Input {...register('description')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Crear regla
            </Button>
            {createRule.isError && (
              <p className="w-full text-sm text-destructive">{createRule.error.message}</p>
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
      {isError && <QueryError message="No se pudieron cargar tus gastos programados." />}
      {rules && rules.length === 0 && <EmptyState message="Aún no tienes gastos programados." />}

      {rules && rules.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:pt-4 last:pb-4"
              >
                <div>
                  <p className="font-medium">
                    {rule.name}{' '}
                    <span className="text-sm text-muted-foreground">
                      ({rule.type === 'INCOME' ? '+' : '-'}S/ {Number(rule.amount).toFixed(2)} ·{' '}
                      {FREQUENCY_LABELS[rule.frequency]})
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {accountById.get(rule.accountId) ?? '—'} · {categoryById.get(rule.categoryId) ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={rule.isActive}
                      onCheckedChange={(checked) =>
                        updateRule.mutate({ id: rule.id, input: { isActive: checked === true } })
                      }
                    />
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </label>
                  <ConfirmDeleteButton
                    aria-label="Eliminar regla"
                    description="Esta regla recurrente se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteRule.mutate(rule.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
