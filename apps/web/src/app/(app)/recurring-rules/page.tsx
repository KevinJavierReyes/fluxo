'use client';

import { CalendarIcon, HandIcon, PencilIcon, RepeatIcon, WalletIcon, ZapIcon } from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useDeleteRecurringRule, useRecurringRules, useUpdateRecurringRule } from '@/hooks/use-recurring-rules';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { DeleteRecurringRuleButton } from '@/components/delete-recurring-rule-button';
import { RecurringRuleActiveToggle } from '@/components/recurring-rule-active-toggle';
import { RecurringRuleFormDialog } from '@/components/recurring-rule-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupChip } from '@/components/group-chip';
import { ACCOUNT_TYPE_META } from '@/lib/account-type';
import { formatLongDate } from '@/lib/format';
import { recurrenceLabel } from '@/lib/recurrence';

export default function RecurringRulesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: rules, isLoading, isError } = useRecurringRules();
  const updateRule = useUpdateRecurringRule();
  const deleteRule = useDeleteRecurringRule();

  const accountById = new Map(accounts?.map((a) => [a.id, { name: a.name, type: a.type }]));
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
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="font-medium">
                    {rule.name}{' '}
                    <span className="text-sm text-muted-foreground">
                      ({rule.type === 'INCOME' ? '+' : '-'}S/ {Number(rule.amount).toFixed(2)})
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const account = accountById.get(rule.accountId);
                      const AccountIcon = account ? ACCOUNT_TYPE_META[account.type].icon : WalletIcon;
                      return (
                        <Badge variant="outline">
                          <AccountIcon />
                          {account?.name ?? '—'}
                        </Badge>
                      );
                    })()}
                    <Badge variant="secondary">
                      <RepeatIcon />
                      {recurrenceLabel(rule)}
                    </Badge>
                    {rule.autoConfirm ? (
                      <Badge variant="success" title="Cada ocurrencia pasa sola a confirmada al llegar su fecha.">
                        <ZapIcon />
                        Automático
                      </Badge>
                    ) : (
                      <Badge variant="secondary" title="Las ocurrencias quedan pendientes hasta que las confirmes.">
                        <HandIcon />
                        Manual
                      </Badge>
                    )}
                    <Badge variant="outline">
                      <CalendarIcon />
                      Desde {formatLongDate(rule.startDate)}
                      {rule.endDate && ` · hasta ${formatLongDate(rule.endDate)}`}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                  <DeleteRecurringRuleButton
                    onConfirm={({ deleteConfirmed }) => deleteRule.mutate({ id: rule.id, deleteConfirmed })}
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
