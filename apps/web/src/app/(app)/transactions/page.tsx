'use client';

import { useEffect, useMemo, useState } from 'react';
import { createTransactionSchema, TransactionType, type CreateTransactionInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { es } from 'react-day-picker/locale';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { useCategoryTypeSync } from '@/hooks/use-category-type-sync';
import { useApplyExpenseTemplate, useExpenseTemplates } from '@/hooks/use-expense-templates';
import {
  useBulkDeleteTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/use-transactions';
import type { ExpenseTemplate } from '@/lib/types';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { DateRangePicker } from '@/components/date-range-picker';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACTION_TYPE_META } from '@/lib/transaction-type';
import { filterGroupsByType, findCategoryGroupType } from '@/lib/category-type';
import { TransactionTypeSelect } from '@/components/transaction-type-select';
import { CategorySelect } from '@/components/category-select';
import { MultiSelectPopover } from '@/components/multi-select-popover';
import { GroupChip } from '@/components/group-chip';
import { FormField } from '@/components/form-field';
import {
  defaultRange,
  dateToUtcMidnight,
  toIsoDate,
  utcMidnightToLocalDate,
  type DateRange,
} from '@/lib/date-range';

export default function TransactionsPage() {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterAccountIds, setFilterAccountIds] = useState<string[]>([]);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Al cambiar el tipo filtrado, descarta las categorías seleccionadas que ya no
  // pertenezcan a ese tipo (quedarían ocultas en el popover pero seguirían filtrando).
  // Reset durante el render (no en un efecto), mismo patrón que `selectionFiltersKey` abajo.
  const [prevFilterType, setPrevFilterType] = useState(filterType);
  if (filterType !== prevFilterType) {
    setPrevFilterType(filterType);
    if (filterType !== 'all') {
      setFilterCategoryIds((prev) => prev.filter((id) => findCategoryGroupType(groups, id) === filterType));
    }
  }

  const hasActiveFilters =
    filterType !== 'all' ||
    filterAccountIds.length > 0 ||
    filterCategoryIds.length > 0 ||
    debouncedSearch !== '';

  const clearFilters = () => {
    setFilterType('all');
    setFilterAccountIds([]);
    setFilterCategoryIds([]);
    setSearchInput('');
  };

  const {
    data: transactions,
    isLoading,
    isError,
  } = useTransactions({
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
    type: filterType === 'all' ? undefined : filterType,
    accountIds: filterAccountIds,
    categoryIds: filterCategoryIds,
    q: debouncedSearch || undefined,
  });
  const { data: templates } = useExpenseTemplates();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const bulkDeleteTransactions = useBulkDeleteTransactions();
  const applyTemplate = useApplyExpenseTemplate();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  // La lista visible cambia con estos filtros, así que la selección deja de
  // tener sentido; se resetea durante el render (no en un efecto) siguiendo
  // el patrón de React para "reset state when a prop changes".
  const selectionFiltersKey = [
    toIsoDate(range.from),
    toIsoDate(range.to),
    filterType,
    filterAccountIds.join(','),
    filterCategoryIds.join(','),
    debouncedSearch,
  ].join('|');
  const [prevSelectionFiltersKey, setPrevSelectionFiltersKey] = useState(selectionFiltersKey);
  if (selectionFiltersKey !== prevSelectionFiltersKey) {
    setPrevSelectionFiltersKey(selectionFiltersKey);
    setSelectedIds(new Set());
  }

  const categories = useMemo(
    () =>
      groups?.flatMap((group) =>
        group.categories.map((category) => ({ ...category, groupName: group.name })),
      ),
    [groups],
  );
  const accountById = new Map(accounts?.map((a) => [a.id, a.name]));
  const categoryById = new Map(
    groups?.flatMap((group) =>
      group.categories.map((category) => [
        category.id,
        { name: category.name, groupColor: group.color, groupIcon: group.icon },
      ] as const),
    ) ?? [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    resetField,
    setValue,
    setFocus,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      accountId: '',
      categoryId: '',
      date: dateToUtcMidnight(new Date()),
    },
  });

  const type = useWatch({ control, name: 'type' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const handleCategoryChange = useCategoryTypeSync({ type, categoryId, groups, setValue });

  useEffect(() => {
    if (accounts && accounts.length > 0 && !getValues('accountId')) {
      setValue('accountId', accounts[0].id);
    }
  }, [accounts, getValues, setValue]);

  useEffect(() => {
    if (categories && categories.length > 0 && !getValues('categoryId')) {
      const defaultCategory =
        categories.find((c) => findCategoryGroupType(groups, c.id) === getValues('type')) ?? categories[0];
      setValue('categoryId', defaultCategory.id);
    }
  }, [categories, groups, getValues, setValue]);

  const [confirmTemplate, setConfirmTemplate] = useState<ExpenseTemplate | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleQuickTemplate = (template: ExpenseTemplate) => {
    const suggestedAmount = template.suggestedAmount != null ? Number(template.suggestedAmount) : null;

    if (suggestedAmount !== null && template.accountId) {
      setConfirmTemplate(template);
      setConfirmAmount(suggestedAmount.toFixed(2));
      setConfirmError(null);
      return;
    }

    setValue('type', template.type);
    setValue('categoryId', template.categoryId);
    if (template.accountId) setValue('accountId', template.accountId);
    setValue('description', template.name);
    setValue('date', dateToUtcMidnight(new Date()));
    if (suggestedAmount !== null) {
      setValue('amount', suggestedAmount);
    } else {
      resetField('amount');
    }
    setFocus('amount');
  };

  const handleCancelConfirm = () => {
    setConfirmTemplate(null);
    setConfirmError(null);
  };

  const handleConfirmApply = () => {
    if (!confirmTemplate) return;
    const amount = Number(confirmAmount);
    if (!confirmAmount || Number.isNaN(amount) || amount <= 0) {
      setConfirmError('Ingresa un monto válido.');
      return;
    }
    applyTemplate.mutate(
      { id: confirmTemplate.id, input: { date: dateToUtcMidnight(new Date()), amount } },
      { onSuccess: () => setConfirmTemplate(null) },
    );
  };

  const onSubmit = async (values: CreateTransactionInput) => {
    await createTransaction.mutateAsync(values);
    const defaultCategory = categories?.find(
      (c) => findCategoryGroupType(groups, c.id) === TransactionType.EXPENSE,
    );
    reset({
      type: TransactionType.EXPENSE,
      accountId: values.accountId,
      categoryId: defaultCategory?.id ?? categories?.[0]?.id ?? '',
      date: dateToUtcMidnight(new Date()),
    });
  };

  const allVisibleSelected =
    !!transactions && transactions.length > 0 && transactions.every((tx) => selectedIds.has(tx.id));

  const toggleSelectAll = (checked: boolean) => {
    if (!transactions) return;
    setSelectedIds(checked ? new Set(transactions.map((tx) => tx.id)) : new Set());
  };

  const toggleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteTransactions.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setConfirmBulkDeleteOpen(false);
      },
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Transacciones" description="Registra ingresos y egresos, incluso a futuro." />

      <Card>
        <CardContent className="flex flex-col gap-4">
          {templates && templates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Gastos frecuentes:</span>
              {templates.map((template) => {
                const hasInstantData = template.suggestedAmount != null && !!template.accountId;
                const chipLabel = `${template.name}${
                  template.suggestedAmount ? ` · S/ ${Number(template.suggestedAmount).toFixed(2)}` : ''
                }`;

                if (!hasInstantData) {
                  return (
                    <Button
                      key={template.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleQuickTemplate(template)}
                    >
                      {chipLabel}
                    </Button>
                  );
                }

                const isOpen = confirmTemplate?.id === template.id;
                return (
                  <Popover
                    key={template.id}
                    open={isOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        handleQuickTemplate(template);
                      } else {
                        handleCancelConfirm();
                      }
                    }}
                  >
                    <PopoverTrigger
                      render={<Button type="button" variant="outline" size="sm" className="rounded-full" />}
                    >
                      {chipLabel}
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">{template.name}</p>
                        <FormField
                          label="Monto"
                          error={confirmError ?? (applyTemplate.isError ? applyTemplate.error.message : undefined)}
                        >
                          <Input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={confirmAmount}
                            onChange={(e) => setConfirmAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmApply();
                              }
                            }}
                          />
                        </FormField>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={handleCancelConfirm}>
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={applyTemplate.isPending}
                            onClick={handleConfirmApply}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <FormField label="Tipo">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TransactionTypeSelect value={field.value} onValueChange={field.onChange} triggerClassName="w-36" />
                )}
              />
            </FormField>
            <FormField label="Cuenta" error={errors.accountId?.message}>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-40" aria-invalid={!!errors.accountId}>
                      <SelectValue placeholder="Selecciona">
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
            </FormField>
            <FormField label="Categoría" error={errors.categoryId?.message}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <CategorySelect
                    groups={groups}
                    type={type}
                    value={field.value}
                    onValueChange={(v) => handleCategoryChange(v, field.onChange)}
                    triggerClassName="w-52"
                    ariaInvalid={!!errors.categoryId}
                  />
                )}
              />
            </FormField>
            <FormField label="Monto" error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                className="w-28"
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
            </FormField>
            <FormField label="Fecha" error={errors.date?.message}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-36 justify-start font-normal"
                          aria-invalid={!!errors.date}
                        />
                      }
                    >
                      <CalendarIcon className="text-muted-foreground" />
                      {field.value
                        ? field.value.toLocaleDateString('es-PE', { timeZone: 'UTC' })
                        : 'Selecciona'}
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <Calendar
                        mode="single"
                        locale={es}
                        selected={field.value ? utcMidnightToLocalDate(field.value) : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          field.onChange(dateToUtcMidnight(date));
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </FormField>
            <FormField label="Descripción" error={errors.description?.message} className="min-w-[220px] flex-1">
              <Input aria-invalid={!!errors.description} {...register('description')} />
            </FormField>
            <div className="flex flex-col gap-1.5">
              <Label className="invisible">Acción</Label>
              <Button type="submit" disabled={isSubmitting}>
                <PlusIcon />
                Registrar
              </Button>
              <p className="min-h-5" aria-hidden="true" />
            </div>
            {createTransaction.isError && (
              <p className="w-full text-sm text-destructive">{createTransaction.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Historial</h2>
        <DateRangePicker value={range} onValueChange={setRange} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Tipo">
          <TransactionTypeSelect
            value={filterType}
            onValueChange={setFilterType}
            triggerClassName="w-44"
            allowAll
            allLabel="Todos los tipos"
          />
        </FormField>
        <FormField label="Cuenta">
          <MultiSelectPopover
            groups={[
              {
                id: 'accounts',
                items: (accounts ?? []).map((account) => ({ id: account.id, label: account.name })),
              },
            ]}
            selectedIds={filterAccountIds}
            onValueChange={setFilterAccountIds}
            allLabel="Todas las cuentas"
            triggerClassName="w-48"
          />
        </FormField>
        <FormField label="Categoría">
          <MultiSelectPopover
            groups={(filterGroupsByType(groups, filterType === 'all' ? undefined : filterType) ?? []).map((group) => ({
              id: group.id,
              header: (
                <span className="flex items-center gap-1.5">
                  <GroupChip color={group.color} icon={group.icon} size="sm" />
                  {group.name}
                </span>
              ),
              items: group.categories.map((category) => ({
                id: category.id,
                label: category.name,
                content: (
                  <>
                    <GroupChip color={group.color} icon={group.icon} size="sm" />
                    {category.name}
                  </>
                ),
              })),
            }))}
            selectedIds={filterCategoryIds}
            onValueChange={setFilterCategoryIds}
            allLabel="Todas las categorías"
            triggerClassName="w-56"
          />
        </FormField>
        <FormField label="Descripción" className="min-w-[220px] flex-1">
          <Input
            placeholder="Buscar por descripción…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </FormField>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon />
            Limpiar filtros
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2">
          <p className="text-sm text-muted-foreground">{selectedIds.size} transacción(es) seleccionada(s)</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Deseleccionar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmBulkDeleteOpen(true)}
            >
              <Trash2Icon />
              Eliminar seleccionadas
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmBulkDeleteOpen} onOpenChange={setConfirmBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} transacción(es)?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleteTransactions.isPending}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <QueryError message="No se pudieron cargar tus transacciones." />}

      {transactions && transactions.length === 0 && (
        <EmptyState message={hasActiveFilters ? 'No hay transacciones que coincidan con los filtros.' : 'Aún no hay transacciones.'} />
      )}

      {transactions && transactions.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      aria-label="Seleccionar todas"
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="pl-4">
                      <Checkbox
                        aria-label="Seleccionar transacción"
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={(checked) => toggleSelectRow(tx.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(tx.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const meta = TRANSACTION_TYPE_META[tx.type];
                        const Icon = meta.icon;
                        return (
                          <Badge variant={meta.variant}>
                            <Icon data-icon="inline-start" />
                            {meta.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{accountById.get(tx.accountId) ?? '—'}</TableCell>
                    <TableCell>
                      {(() => {
                        const cat = categoryById.get(tx.categoryId);
                        if (!cat) return '—';
                        return (
                          <span className="flex items-center gap-1.5">
                            <GroupChip color={cat.groupColor} icon={cat.groupIcon} size="sm" />
                            {cat.name}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{tx.description ?? '—'}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${tx.type === 'INCOME' ? 'text-success' : 'text-destructive'}`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}S/ {Number(tx.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <EditTransactionDialog
                          transaction={tx}
                          accounts={accounts}
                          groups={groups}
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar transacción"
                            >
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <ConfirmDeleteButton
                          aria-label="Eliminar transacción"
                          description="Esta transacción se eliminará de forma permanente. Esta acción no se puede deshacer."
                          onConfirm={() => deleteTransaction.mutate(tx.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
