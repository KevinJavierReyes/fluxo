'use client';

import {
  createExpenseTemplateSchema,
  TransactionType,
  type CreateExpenseTemplateInput,
} from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import {
  useApplyExpenseTemplate,
  useCreateExpenseTemplate,
  useDeleteExpenseTemplate,
  useExpenseTemplates,
} from '@/hooks/use-expense-templates';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { InlineActionRow } from '@/components/inline-action-row';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
    </InlineActionRow>
  );
}

export default function ExpenseTemplatesPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const { data: templates, isLoading, isError } = useExpenseTemplates();
  const createTemplate = useCreateExpenseTemplate();
  const deleteTemplate = useDeleteExpenseTemplate();

  const categories = groups?.flatMap((group) =>
    group.categories.map((category) => ({ ...category, groupName: group.name })),
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories?.map((c) => [c.id, c.name]));

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseTemplateInput>({
    resolver: zodResolver(createExpenseTemplateSchema),
    defaultValues: { type: TransactionType.EXPENSE, categoryId: '' },
  });

  const onSubmit = async (values: CreateExpenseTemplateInput) => {
    await createTemplate.mutateAsync(values);
    reset({ type: TransactionType.EXPENSE, categoryId: '' });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gastos frecuentes"
        description="Plantillas rápidas para registrar en un clic un gasto que repites seguido."
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
              <Label>Categoría</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Selecciona">
                        {(value: string) => categoryById.get(value)}
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
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cuenta por defecto</Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Elegir al aplicar">
                        {(value: string) => accountById.get(value)}
                      </SelectValue>
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
              <Label>Monto sugerido</Label>
              <Input
                type="number"
                step="0.01"
                className="w-28"
                {...register('suggestedAmount', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Crear plantilla
            </Button>
            {createTemplate.isError && (
              <p className="w-full text-sm text-destructive">{createTemplate.error.message}</p>
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
      {isError && <QueryError message="No se pudieron cargar tus plantillas." />}
      {templates && templates.length === 0 && <EmptyState message="Aún no tienes plantillas." />}

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
                  <p className="text-sm text-muted-foreground">
                    {categoryById.get(template.categoryId) ?? '—'}
                    {template.accountId ? ` · ${accountById.get(template.accountId)}` : ''}
                    {template.suggestedAmount ? ` · S/ ${Number(template.suggestedAmount).toFixed(2)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ApplyRow templateId={template.id} />
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
