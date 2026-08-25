'use client';

import { createSavingsGoalSchema, type CreateSavingsGoalInput } from '@fluxo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useContributeSavingsGoal,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useSavingsGoals,
} from '@/hooks/use-savings-goals';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { InlineActionRow } from '@/components/inline-action-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ContributeRow({ goalId }: { goalId: string }) {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const contribute = useContributeSavingsGoal();

  return (
    <InlineActionRow
      submitLabel="Aportar"
      disabled={!accountId || !amount}
      pending={contribute.isPending}
      error={contribute.isError ? contribute.error.message : null}
      onSubmit={() =>
        contribute.mutate({
          id: goalId,
          input: { accountId, amount: Number(amount), date: new Date(`${date}T00:00:00Z`) },
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
      <Input
        type="number"
        step="0.01"
        placeholder="Monto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24"
      />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
    </InlineActionRow>
  );
}

export default function SavingsGoalsPage() {
  const { data: goals, isLoading, isError } = useSavingsGoals();
  const createGoal = useCreateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSavingsGoalInput>({
    resolver: zodResolver(createSavingsGoalSchema),
  });

  const onSubmit = async (values: CreateSavingsGoalInput) => {
    await createGoal.mutateAsync(values);
    reset({ name: '', targetAmount: undefined, targetDate: undefined });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Metas de ahorro" description="Define un objetivo y ve tu avance en tiempo real." />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Monto objetivo</Label>
              <Input type="number" step="0.01" className="w-32" {...register('targetAmount')} />
              {errors.targetAmount && (
                <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fecha límite (opcional)</Label>
              <Input
                type="date"
                {...register('targetDate', {
                  setValueAs: (v: string) => (v ? new Date(`${v}T00:00:00Z`) : undefined),
                })}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon />
              Crear meta
            </Button>
            {createGoal.isError && (
              <p className="w-full text-sm text-destructive">{createGoal.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus metas de ahorro." />}
      {goals && goals.length === 0 && <EmptyState message="Aún no tienes metas de ahorro." />}

      <div className="flex flex-col gap-4">
        {goals?.map((goal) => {
          const target = Number(goal.targetAmount);
          const percent = target > 0 ? Math.min(100, (goal.progress / target) * 100) : 0;
          return (
            <Card key={goal.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      S/ {goal.progress.toFixed(2)} de S/ {target.toFixed(2)}
                      {goal.targetDate &&
                        ` · antes del ${new Date(goal.targetDate).toLocaleDateString('es-PE', { timeZone: 'UTC' })}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar meta"
                    onClick={() => deleteGoal.mutate(goal.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <Progress value={percent} />
                <ContributeRow goalId={goal.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
