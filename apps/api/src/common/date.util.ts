export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * "Hoy" en la zona horaria del usuario, representado como medianoche UTC del
 * día civil correspondiente — igual convención que el resto del módulo, para
 * poder compararse directamente con columnas `@db.Date`.
 *
 * Sin esto, un usuario en UTC-5 a las 20:00 ya está "mañana" según
 * `todayUtc()`, y una transacción registrada "hoy" cae en el día equivocado.
 */
export function todayForUser(timezone: string): Date {
  const { year, month, day } = civilDateInTimezone(new Date(), timezone);
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfMonthForUser(timezone: string): Date {
  const { year, month } = civilDateInTimezone(new Date(), timezone);
  return new Date(Date.UTC(year, month - 1, 1));
}

function civilDateInTimezone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Valida que un string sea una zona horaria IANA reconocida por el runtime. */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export type Granularity = 'day' | 'week' | 'month';

/** Lunes de la semana de `date`, a medianoche UTC. */
export function startOfWeekUtc(date: Date): Date {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const weekday = result.getUTCDay(); // 0 = domingo
  const diff = weekday === 0 ? -6 : 1 - weekday;
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

export function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Inicio del bucket al que pertenece `date` para la granularidad dada. */
export function bucketStart(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'week':
      return startOfWeekUtc(date);
    case 'month':
      return startOfMonthUtc(date);
    default:
      return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
  }
}

export function nextBucket(bucket: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'week':
      return addDays(bucket, 7);
    case 'month':
      return new Date(
        Date.UTC(bucket.getUTCFullYear(), bucket.getUTCMonth() + 1, 1),
      );
    default:
      return addDays(bucket, 1);
  }
}

/**
 * Todos los buckets que cubren el rango [from, to], tengan o no movimientos.
 * A diferencia de la proyección, esto densifica la serie para graficarla.
 */
export function eachBucket(
  from: Date,
  to: Date,
  granularity: Granularity,
): Date[] {
  const buckets: Date[] = [];
  let cursor = bucketStart(from, granularity);
  const limit = bucketStart(to, granularity);
  // Guarda de seguridad: 10 años de días es el peor caso razonable.
  let guard = 0;
  while (cursor.getTime() <= limit.getTime() && guard < 4000) {
    buckets.push(cursor);
    cursor = nextBucket(cursor, granularity);
    guard += 1;
  }
  return buckets;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
