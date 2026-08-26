/** El origen puro de la API (sin el prefijo /api) — lo necesitan las rutas OAuth/MCP, que viven fuera de ese prefijo (ver apps/api/src/main.ts). */
export function getApiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');
}
