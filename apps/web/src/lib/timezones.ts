/**
 * Lista curada, no exhaustiva (~25 zonas IANA de las más comunes por
 * región) — un <Select> nativo sin buscador no da para las ~400 zonas
 * reales. El backend valida contra la lista completa de IANA igual, así
 * que un usuario con una zona fuera de esta lista puede seguir usándola
 * (queda seleccionada aunque no aparezca acá), solo no puede elegirla de
 * nuevo desde este selector.
 */
export const COMMON_TIMEZONES = [
  'UTC',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Caracas',
  'America/La_Paz',
  'America/Guayaquil',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;
