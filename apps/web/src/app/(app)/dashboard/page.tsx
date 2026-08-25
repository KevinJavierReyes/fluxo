'use client';

import { AlertTriangleIcon, TrendingUpIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { ChartCard } from '@/components/chart-card';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';

function formatCurrency(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: 'short' });
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Tu flujo de caja proyectado a los próximos 90 días." />

      {isLoading && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {isError && <QueryError message="No se pudo cargar el dashboard." />}

      {data && <DashboardContent data={data} />}
    </div>
  );
}

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useDashboardSummary>['data']> }) {
  const chartData = data.projection.points.map((point) => ({
    date: point.date,
    saldo: point.closingBalance,
  }));

  const hasNegative = data.projection.negativeDays.length > 0;
  const firstNegativeDay = hasNegative ? data.projection.negativeDays[0] : null;

  return (
    <>
      {hasNegative && firstNegativeDay ? (
        <Alert variant="warning">
          <AlertTriangleIcon />
          <AlertDescription>
            Cuidado, el {formatDate(firstNegativeDay)} tu saldo proyectado cae en rojo. Revisa tu presupuesto.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="success">
          <TrendingUpIcon />
          <AlertDescription>
            Felicitaciones, mantienes un flujo de caja positivo en los próximos 90 días.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Saldo total</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(data.totalBalance)}</CardTitle>
          </CardHeader>
        </Card>
        {data.accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardDescription>{account.name}</CardDescription>
              <CardTitle className="text-xl">{formatCurrency(account.balance)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <ChartCard title="Saldo proyectado">
        {chartData.length === 0 ? (
          <EmptyState message="Aún no hay movimientos programados en los próximos 90 días." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => formatDate(value)}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                tickFormatter={(value: number) => `S/${value.toFixed(0)}`}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label: string) => formatDate(label)}
                contentStyle={{
                  backgroundColor: 'var(--color-popover)',
                  color: 'var(--color-popover-foreground)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Area
                type="stepAfter"
                dataKey="saldo"
                stroke="var(--color-primary)"
                fill="url(#saldoGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Gasto por categoría este mes">
        {data.categoryBreakdown.length === 0 ? (
          <EmptyState message="Aún no registras gastos este mes." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.categoryBreakdown.length * 36)}>
            <BarChart data={data.categoryBreakdown} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value: number) => `S/${value.toFixed(0)}`}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'var(--color-popover)',
                  color: 'var(--color-popover-foreground)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}
