import { RecurrenceFrequency } from '@prisma/client';
import { daysInMonth } from '../../common/date.util';

export interface RuleScheduleInput {
  frequency: RecurrenceFrequency;
  interval: number;
  byMonthDay: number | null;
  byWeekday: number | null;
  startDate: Date;
  endDate: Date | null;
}

const MAX_ITERATIONS = 3000;

/**
 * Genera las fechas de ocurrencia de una regla recurrente dentro de [from, to]
 * (inclusive), respetando startDate/endDate. Para MONTHLY, el día se ajusta
 * (clamp) al último día del mes cuando byMonthDay no existe en ese mes
 * (ej. día 31 en febrero -> 28/29).
 */
export function generateOccurrenceDates(
  rule: RuleScheduleInput,
  from: Date,
  to: Date,
): Date[] {
  const endBound =
    rule.endDate && rule.endDate.getTime() < to.getTime() ? rule.endDate : to;
  if (endBound.getTime() < rule.startDate.getTime()) {
    return [];
  }

  switch (rule.frequency) {
    case RecurrenceFrequency.MONTHLY:
      return generateMonthly(rule, from, endBound);
    case RecurrenceFrequency.YEARLY:
      return generateYearly(rule, from, endBound);
    case RecurrenceFrequency.WEEKLY:
      return generateWeekly(rule, from, endBound);
    // CUSTOM no tiene hoy ningún campo propio en el schema (sin cron, sin
    // lista de días) más allá de `interval`, así que se comporta igual que
    // DAILY: cada `interval` días. No es un alias accidental — es lo único
    // que se puede interpretar con los datos disponibles. Si se agrega un
    // patrón de recurrencia realmente distinto, este case necesita su
    // propia función.
    case RecurrenceFrequency.DAILY:
    case RecurrenceFrequency.CUSTOM:
    default:
      return generateDaily(rule, from, endBound);
  }
}

function generateMonthly(
  rule: RuleScheduleInput,
  from: Date,
  endBound: Date,
): Date[] {
  const dates: Date[] = [];
  const day = rule.byMonthDay ?? rule.startDate.getUTCDate();
  let year = rule.startDate.getUTCFullYear();
  let month = rule.startDate.getUTCMonth();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const occurrence = new Date(
      Date.UTC(year, month, Math.min(day, daysInMonth(year, month))),
    );
    if (occurrence.getTime() > endBound.getTime()) break;
    if (
      occurrence.getTime() >= rule.startDate.getTime() &&
      occurrence.getTime() >= from.getTime()
    ) {
      dates.push(occurrence);
    }
    month += rule.interval;
    year += Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
  }

  return dates;
}

function generateYearly(
  rule: RuleScheduleInput,
  from: Date,
  endBound: Date,
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (cursor.getTime() > endBound.getTime()) break;
    if (cursor.getTime() >= from.getTime()) {
      dates.push(new Date(cursor));
    }
    cursor = new Date(
      Date.UTC(
        cursor.getUTCFullYear() + rule.interval,
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
      ),
    );
  }

  return dates;
}

function generateWeekly(
  rule: RuleScheduleInput,
  from: Date,
  endBound: Date,
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);

  if (rule.byWeekday !== null) {
    const diff = (rule.byWeekday - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + diff);
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (cursor.getTime() > endBound.getTime()) break;
    if (
      cursor.getTime() >= rule.startDate.getTime() &&
      cursor.getTime() >= from.getTime()
    ) {
      dates.push(new Date(cursor));
    }
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 7 * rule.interval);
  }

  return dates;
}

function generateDaily(
  rule: RuleScheduleInput,
  from: Date,
  endBound: Date,
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (cursor.getTime() > endBound.getTime()) break;
    if (cursor.getTime() >= from.getTime()) {
      dates.push(new Date(cursor));
    }
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + rule.interval);
  }

  return dates;
}
