import { Prisma } from '@prisma/client';

/**
 * Convierte recursivamente cada `Prisma.Decimal` de un valor a `number`.
 * Usado tanto por el interceptor HTTP (DecimalToNumberInterceptor) como por
 * el servidor MCP, que no pasa por el pipeline de interceptors de Nest — el
 * SDK de MCP escribe la respuesta directo al socket.
 *
 * Nota de precisión: un `Decimal(14,2)` cabe sin pérdida en un IEEE-754
 * double (enteros exactos hasta 2^53), así que la conversión es segura para
 * los montos que maneja Fluxo.
 */
export function decimalsToNumbers(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => decimalsToNumbers(item, seen));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) {
      return obj;
    }
    seen.add(obj);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = decimalsToNumbers(obj[key], seen);
    }
    return result;
  }
  return value;
}
