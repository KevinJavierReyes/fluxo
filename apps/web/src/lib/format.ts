export function formatCurrency(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}S/ ${Math.abs(value).toFixed(2)}`;
}

/** Con signo explícito, para los KPIs de cambio del periodo. */
export function formatSignedCurrency(value: number) {
  const sign = value < 0 ? '-' : '+';
  return `${sign}S/ ${Math.abs(value).toFixed(2)}`;
}

/** Compacto, para los ticks de los ejes: S/1.2k */
export function formatCompactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}S/${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}S/${(abs / 1_000).toFixed(1)}k`;
  return `${sign}S/${abs.toFixed(0)}`;
}

/** Las fechas son `@db.Date` a medianoche UTC: formatear siempre en UTC. */
export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
  });
}

export function formatLongDate(value: string | Date) {
  return new Date(value).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
