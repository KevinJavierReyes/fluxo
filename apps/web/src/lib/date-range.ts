import type { OverviewGranularity } from '@fluxo/shared';

export interface DateRange {
  from: Date;
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Las fechas viajan como `@db.Date` a medianoche UTC en toda la app. */
export function dateToUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function utcMidnightToLocalDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function todayUtc(): Date {
  return dateToUtcMidnight(new Date());
}

export function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(range: DateRange): number {
  return Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1;
}

export type RangePresetId =
  | 'this-month'
  | 'last-30'
  | 'next-90'
  | 'this-year'
  | 'custom';

export const RANGE_PRESETS: {
  id: Exclude<RangePresetId, 'custom'>;
  label: string;
  build: () => DateRange;
}[] = [
  {
    id: 'this-month',
    label: 'Este mes',
    build: () => {
      const today = todayUtc();
      return {
        from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
        to: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
        ),
      };
    },
  },
  {
    id: 'last-30',
    label: 'Últimos 30 días',
    build: () => {
      const today = todayUtc();
      return { from: addDaysUtc(today, -29), to: today };
    },
  },
  {
    id: 'next-90',
    label: 'Próximos 90 días',
    build: () => {
      const today = todayUtc();
      return { from: today, to: addDaysUtc(today, 90) };
    },
  },
  {
    id: 'this-year',
    label: 'Este año',
    build: () => {
      const today = todayUtc();
      return {
        from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
        to: new Date(Date.UTC(today.getUTCFullYear(), 11, 31)),
      };
    },
  },
];

export function defaultRange(): DateRange {
  return RANGE_PRESETS[0].build();
}

export function matchPreset(range: DateRange): RangePresetId {
  for (const preset of RANGE_PRESETS) {
    const candidate = preset.build();
    if (
      candidate.from.getTime() === range.from.getTime() &&
      candidate.to.getTime() === range.to.getTime()
    ) {
      return preset.id;
    }
  }
  return 'custom';
}

/**
 * Desplaza el rango por su propio largo. Sin tope hacia el futuro: navegar a
 * meses proyectados es justamente lo que queremos permitir.
 */
export function shiftRange(range: DateRange, direction: 1 | -1): DateRange {
  const isWholeMonth =
    range.from.getUTCDate() === 1 &&
    range.to.getUTCDate() ===
      new Date(
        Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth() + 1, 0),
      ).getUTCDate() &&
    range.from.getUTCMonth() === range.to.getUTCMonth() &&
    range.from.getUTCFullYear() === range.to.getUTCFullYear();

  if (isWholeMonth) {
    const month = range.from.getUTCMonth() + direction;
    const year = range.from.getUTCFullYear();
    return {
      from: new Date(Date.UTC(year, month, 1)),
      to: new Date(Date.UTC(year, month + 1, 0)),
    };
  }

  const length = daysBetween(range);
  return {
    from: addDaysUtc(range.from, direction * length),
    to: addDaysUtc(range.to, direction * length),
  };
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (date: Date) =>
    date.toLocaleDateString('es-PE', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}

/**
 * Qué granularidades tienen sentido para el rango: días se vuelve ilegible más
 * allá de un año, y meses no dice nada en un rango de pocas semanas.
 */
export function availableGranularities(
  range: DateRange,
): Record<OverviewGranularity, boolean> {
  const days = daysBetween(range);
  return {
    day: days <= 400,
    week: days >= 14,
    month: days >= 60,
  };
}

export function resolveGranularity(
  range: DateRange,
  preferred: OverviewGranularity,
): OverviewGranularity {
  const available = availableGranularities(range);
  if (available[preferred]) return preferred;
  if (available.day) return 'day';
  if (available.week) return 'week';
  return 'month';
}
