'use client';

import { createBudgetSchema, type CreateBudgetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useBudgetStatus, useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/use-budgets';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryGroupSelect } from '@/components/category-group-select';
import { GroupChip } from '@/components/group-chip';
import { cn } from '@/lib/utils';

export default function BudgetsPage() {
  const { data: groups } = useCategoryGroups();
  const { data: budgets, isLoading, isError } = useBudgets();
  const { data: status } = useBudgetStatus();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const expenseGroups = groups?.filter((g) => g.type === 'EXPENSE');
  const groupById = new Map(groups?.map((g) => [g.id, g]));
  const statusByGroup = new Map(status?.map((s) => [s.categoryGroupId, s]));

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: { categoryGroupId: '' },
  });

  const onSubmit = async (values: CreateBudgetInput) => {
    await createBudget.mutateAsync(values);
    reset({ categoryGroupId: '', amount: undefined, effectiveFrom: undefined });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Presupuestos" description="Límite mensual de gasto por categoría, con seguimiento en vivo." />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Grupo de categoría</Label>
              <Controller
                name="categoryGroupId"
                control={control}
                render={({ field }) => (
                  <CategoryGroupSelect
                    groups={expenseGroups}
                    value={field.value}
                    onValueChange={field.onChange}
                    triggerClassName="w-52"
                    ariaInvalid={!!errors.categoryGroupId}
                  />
                )}
              />
              {errors.categoryGroupId && (
                <p className="text-sm text-destructive">{errors.categoryGroupId.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Límite mensual</Label>
              <Input type="number" step="0.01" className="w-32" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vigente desde</Label>
              <Input
                type="date"
                {...register('effectiveFrom', {
                  setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
                })}
              />
              {errors.effectiveFrom && (
                <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Crear presupuesto
            </Button>
            {createBudget.isError && (
              <p className="w-full text-sm text-destructive">{createBudget.error.message}</p>
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
      {isError && <QueryError message="No se pudieron cargar tus presupuestos." />}
      {budgets && budgets.length === 0 && <EmptyState message="Aún no tienes presupuestos." />}

      <div className="flex flex-col gap-4">
        {budgets?.map((budget) => {
          const s = statusByGroup.get(budget.categoryGroupId);
          const percent = s ? Math.min(100, s.percentUsed) : 0;
          const group = groupById.get(budget.categoryGroupId);
          return (
            <Card key={budget.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium">
                      {group && <GroupChip color={group.color} icon={group.icon} size="sm" />}
                      {group?.name ?? '—'}
                    </p>
                    <p className={cn('text-sm', s?.isOverBudget ? 'text-destructive' : 'text-muted-foreground')}>
                      {s
                        ? `S/ ${s.spentAmount.toFixed(2)} de S/ ${s.budgetAmount.toFixed(2)} este mes (${s.percentUsed.toFixed(0)}%)`
                        : `Límite S/ ${Number(budget.amount).toFixed(2)}`}
                    </p>
                  </div>
                  <ConfirmDeleteButton
                    aria-label="Eliminar presupuesto"
                    description="Este presupuesto se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteBudget.mutate(budget.id)}
                  />
                </div>
                <Progress value={percent} indicatorClassName={s?.isOverBudget ? 'bg-destructive' : undefined} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
