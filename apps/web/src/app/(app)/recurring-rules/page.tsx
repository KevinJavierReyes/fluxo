'use client';

import { PencilIcon } from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useDeleteRecurringRule, useRecurringRules, useUpdateRecurringRule } from '@/hooks/use-recurring-rules';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { RecurringRuleActiveToggle } from '@/components/recurring-rule-active-toggle';
import { RecurringRuleFormDialog } from '@/components/recurring-rule-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupChip } from '@/components/group-chip';
import { FREQUENCY_LABELS } from '@/lib/recurrence';

export default function RecurringRulesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: rules, isLoading, isError } = useRecurringRules();
  const updateRule = useUpdateRecurringRule();
  const deleteRule = useDeleteRecurringRule();

  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(
    groups?.flatMap((group) =>
      group.categories.map((category) => [
        category.id,
        { name: category.name, groupColor: group.color, groupIcon: group.icon },
      ] as const),
    ) ?? [],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gastos programados"
        description="Reglas recurrentes que generan movimientos automáticamente (arriendo, suscripciones, etc.)."
        action={<RecurringRuleFormDialog />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus gastos programados." />}
      {rules && rules.length === 0 && (
        <EmptyState
          message="Aún no tienes gastos programados."
          action={<RecurringRuleFormDialog trigger={<Button type="button" variant="outline">Crear la primera</Button>} />}
        />
      )}

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
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {accountById.get(rule.accountId) ?? '—'} ·
                    {(() => {
                      const cat = categoryById.get(rule.categoryId);
                      return cat ? (
                        <span className="flex items-center gap-1.5">
                          <GroupChip color={cat.groupColor} icon={cat.groupIcon} size="sm" />
                          {cat.name}
                        </span>
                      ) : (
                        '—'
                      );
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <RecurringRuleActiveToggle
                    rule={rule}
                    onConfirm={(next) => updateRule.mutate({ id: rule.id, input: { isActive: next } })}
                  />
                  <RecurringRuleFormDialog
                    rule={rule}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar regla">
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton
                    aria-label="Eliminar regla"
                    description="Esta regla recurrente se eliminará de forma permanente. Las transacciones que ya se generaron a partir de ella NO se eliminarán automáticamente: si no las quieres, debes borrarlas manualmente desde el listado de Transacciones (puedes seleccionarlas y eliminarlas en bloque)."
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
