'use client';

import { useState, type ReactElement } from 'react';
import { createBudgetSchema, type CreateBudgetInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCreateBudget, useUpdateBudget } from '@/hooks/use-budgets';
import { FormDialog } from '@/components/form-dialog';
import { CategoryGroupSelect } from '@/components/category-group-select';
import { CategoryGroupFormDialog } from '@/components/category-group-form-dialog';
import { GroupChip } from '@/components/group-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Budget, BudgetStatus, CategoryGroup } from '@/lib/types';

function defaultsFor(budget?: Budget): Partial<CreateBudgetInput> {
  return budget
    ? {
        categoryGroupId: budget.categoryGroupId,
        amount: Number(budget.amount),
        effectiveFrom: new Date(budget.effectiveFrom),
      }
    : {
        categoryGroupId: '',
      };
}

/**
 * Crear o editar un presupuesto en un modal. El API solo permite editar el monto
 * (`updateBudgetSchema` no acepta cambiar el grupo ni la fecha de vigencia), así que
 * en modo edición el grupo se muestra de solo lectura.
 */
export function BudgetFormDialog({
  budget,
  groups,
  status,
  trigger,
}: {
  budget?: Budget;
  groups: CategoryGroup[] | undefined;
  status: BudgetStatus[] | undefined;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const isEdit = Boolean(budget);
  const mutation = isEdit ? updateBudget : createBudget;
  const expenseGroups = groups?.filter((g) => g.type === 'EXPENSE');

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: defaultsFor(budget),
  });

  const selectedGroupId = useWatch({ control, name: 'categoryGroupId' });
  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);
  const selectedStatus = status?.find((s) => s.categoryGroupId === selectedGroupId);

  const onSubmit = handleSubmit(async (values) => {
    if (budget) {
      await updateBudget.mutateAsync({ id: budget.id, input: { amount: values.amount } });
    } else {
      await createBudget.mutateAsync(values);
    }
    setOpen(false);
  });

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Sin `!open`, el onOpenChange(true) que Base UI reemite por eventos de
          // refoco (p.ej. al cerrarse el diálogo anidado de "+ Crear grupo") resetearía
          // el formulario aunque el diálogo ya estuviera abierto.
          if (next && !open) {
            mutation.reset();
            reset(defaultsFor(budget));
          }
        }}
        trigger={
          trigger ?? (
            <Button type="button">
              <PlusIcon />
              Crear presupuesto
            </Button>
          )
        }
        title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        description={
          isEdit
            ? 'Solo puedes actualizar el límite mensual; el grupo no se puede cambiar.'
            : 'Límite mensual de gasto por categoría, con seguimiento en vivo.'
        }
        onSubmit={onSubmit}
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        error={mutation.isError ? mutation.error.message : null}
      >
        {isEdit ? (
          selectedGroup && (
            <div className="flex items-center gap-1.5 text-sm">
              <GroupChip color={selectedGroup.color} icon={selectedGroup.icon} size="sm" />
              {selectedGroup.name}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-group">Grupo de categoría</Label>
            <Controller
              name="categoryGroupId"
              control={control}
              render={({ field }) => (
                <CategoryGroupSelect
                  groups={expenseGroups}
                  value={field.value}
                  onValueChange={field.onChange}
                  triggerClassName="w-full"
                  ariaInvalid={!!errors.categoryGroupId}
                  onCreateGroup={() => setCreateGroupOpen(true)}
                />
              )}
            />
            {errors.categoryGroupId && (
              <p className="text-sm text-destructive">{errors.categoryGroupId.message}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-amount">Límite mensual</Label>
          <Input id="budget-amount" type="number" step="0.01" aria-invalid={!!errors.amount} {...register('amount')} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          {selectedStatus && (
            <p className="text-xs text-muted-foreground">
              Este mes llevas gastado S/ {selectedStatus.spentAmount.toFixed(2)} en este grupo.
            </p>
          )}
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-effective-from">Vigente desde</Label>
            <Input
              id="budget-effective-from"
              type="date"
              aria-invalid={!!errors.effectiveFrom}
              {...register('effectiveFrom', {
                setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
              })}
            />
            {errors.effectiveFrom && (
              <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>
            )}
          </div>
        )}
      </FormDialog>

      {/* El grupo recién creado no queda preseleccionado (una limitación del Select
          subyacente): aparece en la lista y el usuario lo elige con un clic más. */}
      <CategoryGroupFormDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </>
  );
}
