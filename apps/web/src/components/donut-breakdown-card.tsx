'use client';

import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, CHART_TOOLTIP_STYLE } from '@/components/ui/chart';
import { EmptyState } from '@/components/empty-state';
import { GroupChip } from '@/components/group-chip';
import {
  CATEGORY_GROUP_COLORS,
  CATEGORY_GROUP_ICONS,
  DEFAULT_GROUP_ICON,
} from '@/lib/category-group-visuals';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OverviewGroupBreakdown } from '@/lib/types';

/** Por debajo de esto la etiqueta no cabe sin amontonarse con la vecina. */
const MIN_LABEL_PERCENTAGE = 2;

/**
 * Los grupos comparten el color por defecto mientras el usuario no los
 * personalice, y una dona de un solo color no se lee. Respetamos el color
 * elegido en su primera aparición y a los repetidos les damos el siguiente
 * color libre de la paleta.
 */
function withDistinctColors(
  data: OverviewGroupBreakdown[],
): OverviewGroupBreakdown[] {
  const used = new Set<string>();
  let paletteIndex = 0;

  return data.map((entry) => {
    if (!used.has(entry.color)) {
      used.add(entry.color);
      return entry;
    }
    while (
      paletteIndex < CATEGORY_GROUP_COLORS.length &&
      used.has(CATEGORY_GROUP_COLORS[paletteIndex])
    ) {
      paletteIndex += 1;
    }
    const color =
      CATEGORY_GROUP_COLORS[paletteIndex % CATEGORY_GROUP_COLORS.length];
    used.add(color);
    return { ...entry, color };
  });
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  index: number;
}

/**
 * Etiqueta con línea guía y burbuja del color del grupo con su ícono dentro,
 * al estilo del dashboard de Spendy.
 */
function renderIconLabel(data: OverviewGroupBreakdown[]) {
  const RADIAN = Math.PI / 180;

  return function IconLabel({ cx, cy, midAngle, outerRadius, index }: LabelProps) {
    const entry = data[index];
    if (!entry || entry.percentage < MIN_LABEL_PERCENTAGE) return <g />;

    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const startX = cx + outerRadius * cos;
    const startY = cy + outerRadius * sin;
    const bubbleX = cx + (outerRadius + 22) * cos;
    const bubbleY = cy + (outerRadius + 22) * sin;
    const textX = cx + (outerRadius + 42) * cos;
    const textY = cy + (outerRadius + 42) * sin;

    const Icon =
      CATEGORY_GROUP_ICONS[entry.icon] ?? CATEGORY_GROUP_ICONS[DEFAULT_GROUP_ICON];

    return (
      <g>
        <path
          d={`M${startX},${startY}L${bubbleX},${bubbleY}`}
          stroke={entry.color}
          strokeWidth={1.5}
          fill="none"
          opacity={0.5}
        />
        <circle cx={bubbleX} cy={bubbleY} r={13} fill={entry.color} />
        <foreignObject x={bubbleX - 7} y={bubbleY - 7} width={14} height={14}>
          <Icon size={14} color="white" strokeWidth={2.25} />
        </foreignObject>
        <text
          x={textX}
          y={textY}
          fill={entry.color}
          textAnchor={cos >= 0 ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={12}
          fontWeight={500}
        >
          {entry.percentage.toFixed(1)}%
        </text>
      </g>
    );
  };
}

export function DonutBreakdownCard({
  title,
  description,
  data: rawData,
  total,
  emptyMessage,
  tone,
}: {
  title: string;
  description?: string;
  data: OverviewGroupBreakdown[];
  total: number;
  emptyMessage: string;
  tone: 'income' | 'expense';
}) {
  const data = withDistinctColors(rawData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <>
            <ChartContainer height={260}>
              <PieChart margin={{ top: 24, right: 64, bottom: 24, left: 64 }}>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  cornerRadius={4}
                  stroke="none"
                  isAnimationActive={false}
                  labelLine={false}
                  label={renderIconLabel(data)}
                >
                  {data.map((entry) => (
                    <Cell key={entry.groupId} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name,
                  ]}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
              </PieChart>
            </ChartContainer>

            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span
                className={cn(
                  'text-base font-semibold tabular-nums',
                  tone === 'income' ? 'text-success' : 'text-destructive',
                )}
              >
                {tone === 'income' ? '+' : '-'}
                {formatCurrency(total)}
              </span>
            </div>

            <ul className="flex flex-col">
              {data.map((entry) => (
                <li
                  key={entry.groupId}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <GroupChip color={entry.color} icon={entry.icon} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.transactionCount}{' '}
                    {entry.transactionCount === 1 ? 'transacción' : 'transacciones'}
                  </span>
                  <span
                    className={cn(
                      'w-28 shrink-0 text-right font-medium tabular-nums',
                      tone === 'income' ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {tone === 'income' ? '+' : '-'}
                    {formatCurrency(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
