import { RecurrenceFrequency } from '@fluxo/shared';
import type { RecurringRule } from '@/lib/types';

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  CUSTOM: 'Cada N días',
};

export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// [singular, plural] de la unidad según la frecuencia. CUSTOM se comporta como DAILY
// (cada `interval` días), igual que en el generador de ocurrencias del API.
const INTERVAL_UNITS: Record<RecurrenceFrequency, [string, string]> = {
  DAILY: ['día', 'días'],
  WEEKLY: ['semana', 'semanas'],
  MONTHLY: ['mes', 'meses'],
  YEARLY: ['año', 'años'],
  CUSTOM: ['día', 'días'],
};

/** Ej. "Mensual · día 5", "Cada 2 semanas · Lunes", "Cada 3 días". */
export function recurrenceLabel(
  rule: Pick<RecurringRule, 'frequency' | 'interval' | 'byMonthDay' | 'byWeekday'>,
): string {
  const { frequency, interval } = rule;
  const [singular, plural] = INTERVAL_UNITS[frequency];
  const parts = [
    interval > 1
      ? `Cada ${interval} ${plural}`
      : frequency === RecurrenceFrequency.CUSTOM
        ? `Cada ${singular}`
        : FREQUENCY_LABELS[frequency],
  ];
  if (frequency === RecurrenceFrequency.MONTHLY && rule.byMonthDay) {
    parts.push(`día ${rule.byMonthDay}`);
  }
  if (frequency === RecurrenceFrequency.WEEKLY && rule.byWeekday !== null) {
    parts.push(WEEKDAY_LABELS[rule.byWeekday]);
  }
  return parts.join(' · ');
}
