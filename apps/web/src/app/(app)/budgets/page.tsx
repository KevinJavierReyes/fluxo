'use client';

import { PencilIcon } from 'lucide-react';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useBudgetStatus, useBudgets, useDeleteBudget } from '@/hooks/use-budgets';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { BudgetFormDialog } from '@/components/budget-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupChip } from '@/components/group-chip';
import { cn } from '@/lib/utils';

export default function BudgetsPage() {
  const { data: groups } = useCategoryGroups();
  const { data: budgets, isLoading, isError } = useBudgets();
  const { data: status } = useBudgetStatus();
  const deleteBudget = useDeleteBudget();

  const groupById = new Map(groups?.map((g) => [g.id, g]));
  const statusByGroup = new Map(status?.map((s) => [s.categoryGroupId, s]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Presupuestos"
        description="Límite mensual de gasto por categoría, con seguimiento en vivo."
        action={<BudgetFormDialog groups={groups} status={status} />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus presupuestos." />}
      {budgets && budgets.length === 0 && (
        <EmptyState
          message="Aún no tienes presupuestos."
          action={
            <BudgetFormDialog
              groups={groups}
              status={status}
              trigger={<Button type="button" variant="outline">Crear el primero</Button>}
            />
          }
        />
      )}

      <div className="flex flex-col gap-4">
        {budgets?.map((budget) => {
          const s = statusByGroup.get(budget.categoryGroupId);
          const percent = s ? Math.min(100, s.percentUsed) : 0;
          const group = groupById.get(budget.categoryGroupId);
          return (
            <Card key={budget.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
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
                  <div className="flex items-center gap-1">
                    <BudgetFormDialog
                      budget={budget}
                      groups={groups}
                      status={status}
                      trigger={
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar presupuesto">
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <ConfirmDeleteButton
                      aria-label="Eliminar presupuesto"
                      description="Este presupuesto se eliminará de forma permanente. Esta acción no se puede deshacer."
                      onConfirm={() => deleteBudget.mutate(budget.id)}
                    />
                  </div>
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
