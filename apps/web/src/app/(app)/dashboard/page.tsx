'use client';

import { useMemo, useState } from 'react';
import type { OverviewGranularity } from '@fluxo/shared';
import { AlertTriangleIcon, TrendingUpIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useOverview } from '@/hooks/use-overview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  ChartContainer,
  zeroCrossingOffset,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { DateRangePicker } from '@/components/date-range-picker';
import { DonutBreakdownCard } from '@/components/donut-breakdown-card';
import { GranularityToggle } from '@/components/granularity-toggle';
import {
  EMPTY_FILTERS,
  OverviewFilters,
  type OverviewFilterState,
} from '@/components/overview-filters';
import { WalletPreview } from '@/components/wallet-preview';
import {
  availableGranularities,
  defaultRange,
  resolveGranularity,
  type DateRange,
} from '@/lib/date-range';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatLongDate,
  formatSignedCurrency,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Overview } from '@/lib/types';

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [preferredGranularity, setPreferredGranularity] =
    useState<OverviewGranularity>('day');
  const [filters, setFilters] = useState<OverviewFilterState>(EMPTY_FILTERS);

  const available = availableGranularities(range);
  const granularity = resolveGranularity(range, preferredGranularity);

  const { data, isLoading, isError, isFetching } = useOverview({
    range,
    granularity,
    accountId: filters.accountId,
    categoryGroupIds: filters.categoryGroupIds,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Tus cuentas, tus movimientos del periodo y hacia dónde va tu saldo."
      />

      <WalletPreview
        wallets={data?.wallets}
        selectedAccountId={filters.accountId}
        onSelectAccount={(accountId) => setFilters({ ...filters, accountId })}
        isLoading={isLoading}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-medium">Resumen del periodo</h2>
        <DateRangePicker value={range} onValueChange={setRange} />
      </div>

      <OverviewFilters
        value={filters}
        onValueChange={setFilters}
        amountRange={data?.amountRange}
      />

      {isLoading && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {isError && <QueryError message="No se pudo cargar el dashboard." />}

      {data && (
        <div
          className={cn(
            'flex flex-col gap-6 transition-opacity',
            isFetching && 'opacity-70',
          )}
        >
          <ProjectionAlert projection={data.projection} />
          <KpiRow data={data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <BalanceChart
              data={data}
              granularity={granularity}
              available={available}
              onGranularityChange={setPreferredGranularity}
            />
            <ChangesChart
              data={data}
              granularity={granularity}
              available={available}
              onGranularityChange={setPreferredGranularity}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DonutBreakdownCard
              title="Ingresos del periodo"
              description={formatLongDate(range.from) + ' – ' + formatLongDate(range.to)}
              data={data.incomeByGroup}
              total={data.totals.periodIncome}
              emptyMessage="No hay ingresos en este periodo."
              tone="income"
            />
            <DonutBreakdownCard
              title="Egresos del periodo"
              description={formatLongDate(range.from) + ' – ' + formatLongDate(range.to)}
              data={data.expenseByGroup}
              total={data.totals.periodExpenses}
              emptyMessage="No hay egresos en este periodo."
              tone="expense"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** El radar de flujo de caja: mira siempre los próximos 90 días, pase lo que pase con los filtros. */
function ProjectionAlert({ projection }: { projection: Overview['projection'] }) {
  const firstNegativeDay = projection.negativeDays[0];

  if (firstNegativeDay) {
    return (
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertDescription>
          Cuidado, el {formatDate(firstNegativeDay)} tu saldo proyectado cae en rojo.
          Revisa tu presupuesto.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="success">
      <TrendingUpIcon />
      <AlertDescription>
        Felicitaciones, mantienes un flujo de caja positivo en los próximos 90 días.
      </AlertDescription>
    </Alert>
  );
}

function KpiRow({ data }: { data: Overview }) {
  const items = [
    {
      label: 'Saldo total',
      value: formatCurrency(data.totalBalance),
      tone: data.totalBalance < 0 ? 'negative' : 'neutral',
    },
    {
      label: 'Cambio del periodo',
      value: formatSignedCurrency(data.totals.periodChange),
      tone: data.totals.periodChange < 0 ? 'negative' : 'positive',
    },
    {
      label: 'Egresos del periodo',
      value: `-${formatCurrency(data.totals.periodExpenses)}`,
      tone: 'negative',
    },
    {
      label: 'Ingresos del periodo',
      value: `+${formatCurrency(data.totals.periodIncome)}`,
      tone: 'positive',
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle
              className={cn(
                'text-2xl tabular-nums',
                item.tone === 'negative' && 'text-destructive',
                item.tone === 'positive' && 'text-success',
              )}
            >
              {item.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/**
 * Saldo a lo largo del periodo. Cuando el rango pasa de hoy, el tramo futuro se
 * dibuja punteado: es la proyección basada en recurrencias y movimientos ya
 * registrados a futuro.
 */
function BalanceChart({
  data,
  granularity,
  available,
  onGranularityChange,
}: {
  data: Overview;
  granularity: OverviewGranularity;
  available: Record<OverviewGranularity, boolean>;
  onGranularityChange: (value: OverviewGranularity) => void;
}) {
  const chartData = useMemo(() => {
    const series = data.balanceSeries;
    const lastRealIndex = series.reduce(
      (last, point, index) => (point.isFuture ? last : index),
      -1,
    );

    return series.map((point, index) => ({
      bucket: point.bucket,
      // El punto de corte pertenece a ambas series para que las curvas se peguen.
      real: point.isFuture ? null : point.closingBalance,
      proyectado:
        point.isFuture || index === lastRealIndex ? point.closingBalance : null,
    }));
  }, [data.balanceSeries]);

  const hasFuture = data.balanceSeries.some((point) => point.isFuture);
  const hasNegative = data.balanceSeries.some((point) => point.isNegative);
  // El eje es categórico: la marca de "Hoy" tiene que caer sobre un bucket real.
  const todayBucket = hasFuture
    ? data.balanceSeries.filter((point) => !point.isFuture).at(-1)?.bucket
    : undefined;

  // Offset donde cada tramo cruza el cero, para pintar la línea/relleno de
  // verde arriba y rojo abajo en vez de un solo color fijo (ver zeroCrossingOffset).
  const realOffset = useMemo(
    () => zeroCrossingOffset(chartData.map((d) => d.real).filter((v): v is number => v !== null)),
    [chartData],
  );
  const proyectadoOffset = useMemo(
    () =>
      zeroCrossingOffset(chartData.map((d) => d.proyectado).filter((v): v is number => v !== null)),
    [chartData],
  );

  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <div>
          <CardTitle>Saldo de cuentas</CardTitle>
          <CardDescription>
            {hasFuture
              ? 'El tramo punteado es tu saldo proyectado.'
              : 'Saldo acumulado al cierre de cada periodo.'}
          </CardDescription>
        </div>
        <GranularityToggle
          value={granularity}
          available={available}
          onValueChange={onGranularityChange}
        />
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState message="No hay datos para este rango." />
        ) : (
          <ChartContainer height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0 }}>
              <defs>
                {/* Verde arriba de cero, rojo abajo: el color deja de depender del tema
                    y pasa a reflejar si el saldo en ese tramo es positivo o negativo. */}
                <linearGradient id="saldoLineReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={realOffset} stopColor={CHART_COLORS.income} />
                  <stop offset={realOffset} stopColor={CHART_COLORS.expense} />
                </linearGradient>
                <linearGradient id="saldoLineProyectado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={proyectadoOffset} stopColor={CHART_COLORS.income} />
                  <stop offset={proyectadoOffset} stopColor={CHART_COLORS.expense} />
                </linearGradient>
                <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={CHART_COLORS.income} stopOpacity={0.3} />
                  <stop offset={realOffset} stopColor={CHART_COLORS.income} stopOpacity={0.05} />
                  <stop offset={realOffset} stopColor={CHART_COLORS.expense} stopOpacity={0.05} />
                  <stop offset={1} stopColor={CHART_COLORS.expense} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="saldoFuturoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={CHART_COLORS.income} stopOpacity={0.12} />
                  <stop offset={proyectadoOffset} stopColor={CHART_COLORS.income} stopOpacity={0.02} />
                  <stop offset={proyectadoOffset} stopColor={CHART_COLORS.expense} stopOpacity={0.02} />
                  <stop offset={1} stopColor={CHART_COLORS.expense} stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(value: string) => formatDate(value)}
                tick={CHART_AXIS_TICK}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={CHART_AXIS_TICK}
                width={64}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'real' ? 'Saldo' : 'Saldo proyectado',
                ]}
                labelFormatter={(label: string) => formatLongDate(label)}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              {hasNegative && (
                <ReferenceLine y={0} stroke={CHART_COLORS.expense} strokeDasharray="2 2" />
              )}
              {todayBucket && (
                <ReferenceLine
                  x={todayBucket}
                  stroke={CHART_COLORS.axis}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Hoy',
                    position: 'insideTopRight',
                    fill: CHART_COLORS.axis,
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="real"
                stroke="url(#saldoLineReal)"
                fill="url(#saldoGradient)"
                strokeWidth={2}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="proyectado"
                stroke="url(#saldoLineProyectado)"
                strokeDasharray="5 4"
                fill="url(#saldoFuturoGradient)"
                strokeWidth={2}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChangesChart({
  data,
  granularity,
  available,
  onGranularityChange,
}: {
  data: Overview;
  granularity: OverviewGranularity;
  available: Record<OverviewGranularity, boolean>;
  onGranularityChange: (value: OverviewGranularity) => void;
}) {
  const hasMovements = data.changesSeries.some(
    (point) => point.income > 0 || point.expense > 0,
  );

  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <div>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>Ingresos y egresos por periodo.</CardDescription>
        </div>
        <GranularityToggle
          value={granularity}
          available={available}
          onValueChange={onGranularityChange}
        />
      </CardHeader>
      <CardContent>
        {!hasMovements ? (
          <EmptyState message="No hay movimientos en este rango." />
        ) : (
          <ChartContainer height={280}>
            <BarChart data={data.changesSeries} margin={{ top: 8, right: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(value: string) => formatDate(value)}
                tick={CHART_AXIS_TICK}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={CHART_AXIS_TICK}
                width={64}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? 'Ingresos' : 'Egresos',
                ]}
                labelFormatter={(label: string) => formatLongDate(label)}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'income' ? 'Ingresos' : 'Egresos'
                }
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="income"
                fill={CHART_COLORS.income}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expense"
                fill={CHART_COLORS.expense}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
