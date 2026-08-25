'use client';

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

function formatCurrency(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: 'short' });
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) {
    return <p>Cargando...</p>;
  }

  if (isError || !data) {
    return <p className="text-red-600">No se pudo cargar el dashboard.</p>;
  }

  const chartData = data.projection.points.map((point) => ({
    date: point.date,
    saldo: point.closingBalance,
  }));

  const hasNegative = data.projection.negativeDays.length > 0;
  const firstNegativeDay = hasNegative ? data.projection.negativeDays[0] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-600">Tu flujo de caja proyectado a los próximos 90 días.</p>
      </div>

      {hasNegative && firstNegativeDay ? (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          Cuidado, el {formatDate(firstNegativeDay)} tu saldo proyectado cae en rojo. Revisa tu
          presupuesto.
        </div>
      ) : (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-green-800">
          Felicitaciones, mantienes un flujo de caja positivo en los próximos 90 días.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-600">Saldo total</p>
          <p className="text-2xl font-semibold">{formatCurrency(data.totalBalance)}</p>
        </div>
        {data.accounts.map((account) => (
          <div key={account.id} className="rounded border p-4">
            <p className="text-sm text-gray-600">{account.name}</p>
            <p className="text-xl font-medium">{formatCurrency(account.balance)}</p>
          </div>
        ))}
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-4 font-medium">Saldo proyectado</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-600">
            Aún no hay movimientos programados en los próximos 90 días.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => formatDate(value)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value: number) => `S/${value.toFixed(0)}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label: string) => formatDate(label)}
              />
              <Area
                type="stepAfter"
                dataKey="saldo"
                stroke="#000000"
                fill="url(#saldoGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-4 font-medium">Gasto por categoría este mes</h2>
        {data.categoryBreakdown.length === 0 ? (
          <p className="text-sm text-gray-600">Aún no registras gastos este mes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.categoryBreakdown.length * 36)}>
            <BarChart
              data={data.categoryBreakdown}
              layout="vertical"
              margin={{ left: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tickFormatter={(value: number) => `S/${value.toFixed(0)}`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#000000" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
