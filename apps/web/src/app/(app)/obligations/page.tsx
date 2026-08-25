'use client';

import { createObligationSchema, type CreateObligationInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2Icon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useCreateObligation,
  useDeleteObligation,
  useLinkObligationRecurring,
  useObligations,
  useUpdateObligation,
} from '@/hooks/use-obligations';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { InlineActionRow } from '@/components/inline-action-row';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function LinkRecurringRow({ obligationId }: { obligationId: string }) {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [byMonthDay, setByMonthDay] = useState('1');
  const [startDate, setStartDate] = useState(todayStr());
  const linkRecurring = useLinkObligationRecurring();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="text-sm text-muted-foreground">Automatizar pago</p>
      <InlineActionRow
        submitLabel="Vincular"
        disabled={!accountId || !categoryId}
        pending={linkRecurring.isPending}
        error={linkRecurring.isError ? linkRecurring.error.message : null}
        onSubmit={() =>
          linkRecurring.mutate({
            id: obligationId,
            input: {
              accountId,
              categoryId,
              byMonthDay: Number(byMonthDay),
              startDate: new Date(`${startDate}T00:00:00Z`),
            },
          })
        }
      >
        <Select value={accountId} onValueChange={(value) => setAccountId(value ?? '')}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Cuenta">{(value: string) => accounts?.find((a) => a.id === value)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? '')}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Categoría">
              {(value: string) => {
                const c = categories?.find((cat) => cat.id === value);
                return c ? `${c.groupName} / ${c.name}` : undefined;
              }}
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
        <Input
          type="number"
          min={1}
          max={31}
          value={byMonthDay}
          onChange={(e) => setByMonthDay(e.target.value)}
          className="w-16"
          title="Día del mes"
        />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
      </InlineActionRow>
    </div>
  );
}

export default function ObligationsPage() {
  const { data: obligations, isLoading, isError } = useObligations();
  const createObligation = useCreateObligation();
  const updateObligation = useUpdateObligation();
  const deleteObligation = useDeleteObligation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateObligationInput>({
    resolver: zodResolver(createObligationSchema),
  });

  const onSubmit = async (values: CreateObligationInput) => {
    await createObligation.mutateAsync(values);
    reset({});
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Obligaciones"
        description="Todas tus deudas en un solo lugar, para priorizar cuál atacar primero."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>¿A quién le debes?</Label>
              <Input {...register('creditorName')} />
              {errors.creditorName && <p className="text-sm text-destructive">{errors.creditorName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>¿Cuánto falta por pagar?</Label>
              <Input type="number" step="0.01" className="w-32" {...register('totalAmount')} />
              {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>¿Cuánto pagas al mes?</Label>
              <Input type="number" step="0.01" className="w-32" {...register('monthlyPayment')} />
              {errors.monthlyPayment && (
                <p className="text-sm text-destructive">{errors.monthlyPayment.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Meses restantes</Label>
              <Input
                type="number"
                min={0}
                className="w-24"
                {...register('remainingMonths', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tasa (%)</Label>
              <Input
                type="number"
                step="0.01"
                className="w-24"
                {...register('interestRate', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descripción</Label>
              <Input {...register('description')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Agregar obligación
            </Button>
            {createObligation.isError && (
              <p className="w-full text-sm text-destructive">{createObligation.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus obligaciones." />}
      {obligations && obligations.length === 0 && <EmptyState message="Aún no tienes obligaciones registradas." />}

      <div className="flex flex-col gap-4">
        {obligations?.map((obligation) => (
          <Card key={obligation.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${obligation.isPaidOff ? 'text-muted-foreground line-through' : ''}`}>
                    {obligation.creditorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Falta S/ {Number(obligation.totalAmount).toFixed(2)} · S/{' '}
                    {Number(obligation.monthlyPayment).toFixed(2)}/mes
                    {obligation.remainingMonths !== null && ` · ${obligation.remainingMonths} meses`}
                    {obligation.interestRate !== null && ` · ${Number(obligation.interestRate).toFixed(2)}% tasa`}
                  </p>
                  {obligation.description && (
                    <p className="text-sm text-muted-foreground">{obligation.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={obligation.isPaidOff}
                      onCheckedChange={(checked) =>
                        updateObligation.mutate({ id: obligation.id, input: { isPaidOff: checked === true } })
                      }
                    />
                    Pagada
                  </label>
                  <ConfirmDeleteButton
                    aria-label="Eliminar obligación"
                    description="Esta obligación se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteObligation.mutate(obligation.id)}
                  />
                </div>
              </div>
              {obligation.linkedRecurringRuleId ? (
                <p className="flex items-center gap-1.5 border-t pt-3 text-sm text-success">
                  <CheckCircle2Icon className="size-4" />
                  Pago automático vinculado.
                </p>
              ) : (
                <LinkRecurringRow obligationId={obligation.id} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
