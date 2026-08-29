'use client';

import { useState, type ReactElement } from 'react';
import { createExpenseTemplateSchema, TransactionType, type CreateExpenseTemplateInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCreateExpenseTemplate, useUpdateExpenseTemplate } from '@/hooks/use-expense-templates';
import { FormDialog } from '@/components/form-dialog';
import { CategorySelect } from '@/components/category-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExpenseTemplate } from '@/lib/types';

function defaultsFor(template?: ExpenseTemplate): CreateExpenseTemplateInput {
  return template
    ? {
        name: template.name,
        categoryId: template.categoryId,
        accountId: template.accountId ?? undefined,
        suggestedAmount: template.suggestedAmount ? Number(template.suggestedAmount) : undefined,
        type: template.type,
      }
    : {
        name: '',
        categoryId: '',
        accountId: undefined,
        suggestedAmount: undefined,
        type: TransactionType.EXPENSE,
      };
}

/**
 * Crear o editar una plantilla de gasto frecuente en un modal.
 */
export function ExpenseTemplateFormDialog({
  template,
  trigger,
}: {
  template?: ExpenseTemplate;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const createTemplate = useCreateExpenseTemplate();
  const updateTemplate = useUpdateExpenseTemplate();
  const isEdit = Boolean(template);
  const mutation = isEdit ? updateTemplate : createTemplate;

  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateExpenseTemplateInput>({
    resolver: zodResolver(createExpenseTemplateSchema),
    defaultValues: defaultsFor(template),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (template) {
      await updateTemplate.mutateAsync({ id: template.id, input: values });
    } else {
      await createTemplate.mutateAsync(values);
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
          reset(defaultsFor(template));
        }
      }}
      trigger={
        trigger ?? (
          <Button type="button">
            <PlusIcon />
            Nueva plantilla
          </Button>
        )
      }
      title={isEdit ? 'Editar plantilla' : 'Nueva plantilla'}
      description={
        isEdit
          ? 'Actualiza los datos de esta plantilla.'
          : 'Plantillas rápidas para registrar en un clic un gasto que repites seguido.'
      }
      onSubmit={onSubmit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear plantilla'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      error={mutation.isError ? mutation.error.message : null}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-template-name">Nombre</Label>
        <Input id="expense-template-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-template-category">Categoría</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelect
              groups={groups}
              type={TransactionType.EXPENSE}
              value={field.value}
              onValueChange={field.onChange}
              triggerClassName="w-full"
              ariaInvalid={!!errors.categoryId}
            />
          )}
        />
        {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-template-account">Cuenta por defecto</Label>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="expense-template-account" className="w-full">
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
          <Label htmlFor="expense-template-suggested-amount">Monto sugerido</Label>
          <Input
            id="expense-template-suggested-amount"
            type="number"
            step="0.01"
            {...register('suggestedAmount', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
        </div>
      </div>
    </FormDialog>
  );
}
