import { RecurrenceFrequency } from '@fluxo/shared';

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  CUSTOM: 'Cada N días',
};

export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
