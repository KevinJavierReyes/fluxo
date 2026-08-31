'use client';

import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useApplyExpenseTemplate,
  useDeleteExpenseTemplate,
  useExpenseTemplates,
} from '@/hooks/use-expense-templates';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { InlineActionRow } from '@/components/inline-action-row';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { ExpenseTemplateFormDialog } from '@/components/expense-template-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupChip } from '@/components/group-chip';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ApplyRow({ templateId }: { templateId: string }) {
  const [date, setDate] = useState(todayStr());
  const applyTemplate = useApplyExpenseTemplate();

  return (
    <InlineActionRow
      submitLabel="Aplicar"
      pending={applyTemplate.isPending}
      error={applyTemplate.isError ? applyTemplate.error.message : null}
      onSubmit={() =>
        applyTemplate.mutate({ id: templateId, input: { date: new Date(`${date}T00:00:00Z`) } })
      }
    >
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-40" />
    </InlineActionRow>
  );
}

export default function ExpenseTemplatesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: templates, isLoading, isError } = useExpenseTemplates();
  const deleteTemplate = useDeleteExpenseTemplate();

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
        title="Gastos frecuentes"
        description="Plantillas rápidas para registrar en un clic un gasto que repites seguido."
        action={<ExpenseTemplateFormDialog />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus plantillas." />}
      {templates && templates.length === 0 && (
        <EmptyState
          message="Aún no tienes plantillas."
          action={
            <ExpenseTemplateFormDialog
              trigger={<Button type="button" variant="outline">Crear la primera</Button>}
            />
          }
        />
      )}

      {templates && templates.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:pt-4 last:pb-4"
              >
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {(() => {
                      const cat = categoryById.get(template.categoryId);
                      return cat ? (
                        <span className="flex items-center gap-1.5">
                          <GroupChip color={cat.groupColor} icon={cat.groupIcon} size="sm" />
                          {cat.name}
                        </span>
                      ) : (
                        '—'
                      );
                    })()}
                    {template.accountId ? ` · ${accountById.get(template.accountId)}` : ''}
                    {template.suggestedAmount ? ` · S/ ${Number(template.suggestedAmount).toFixed(2)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ApplyRow templateId={template.id} />
                  <ExpenseTemplateFormDialog
                    template={template}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar plantilla">
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton
                    aria-label="Eliminar plantilla"
                    description="Esta plantilla se eliminará de forma permanente. Esta acción no se puede deshacer."
                    onConfirm={() => deleteTemplate.mutate(template.id)}
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
