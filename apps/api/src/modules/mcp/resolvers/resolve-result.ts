export interface ResolveCandidate {
  id: string;
  label: string;
  detail?: string;
}

export type ResolveResult<T> =
  | { status: 'resolved'; id: string; entity: T }
  | { status: 'ambiguous'; candidates: ResolveCandidate[] }
  | { status: 'not_found'; candidates: ResolveCandidate[] };

export function resolved<T>(id: string, entity: T): ResolveResult<T> {
  return { status: 'resolved', id, entity };
}

export function ambiguous<T>(candidates: ResolveCandidate[]): ResolveResult<T> {
  return { status: 'ambiguous', candidates };
}

export function notFound<T>(
  candidates: ResolveCandidate[] = [],
): ResolveResult<T> {
  return { status: 'not_found', candidates };
}

/** cuid: letra "c" + 20-30 caracteres alfanuméricos en minúscula. */
const CUID_PATTERN = /^c[a-z0-9]{20,30}$/;

export function looksLikeId(value: string): boolean {
  return CUID_PATTERN.test(value);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita marcas diacríticas combinantes (acentos)
    .toLowerCase()
    .trim();
}

/**
 * Cascada de resolución por nombre, en orden: match exacto normalizado
 * (sin acentos/mayúsculas) -> substring. Nunca elige "el más parecido"
 * cuando hay más de un candidato — eso es justamente lo que se busca
 * evitar: que un agente adivine y corrompa datos en silencio.
 */
export function matchByName<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
): T[] {
  const normalizedQuery = normalize(query);

  const exact = items.filter(
    (item) => normalize(getName(item)) === normalizedQuery,
  );
  if (exact.length > 0) {
    return exact;
  }

  return items.filter((item) =>
    normalize(getName(item)).includes(normalizedQuery),
  );
}

/**
 * Igual cascada que los resolvers dedicados (account/category), pero para
 * recursos que no tienen uno propio: recibe la lista ya cargada y arma el
 * ResolveResult a partir de matchByName. `getId` e `getDetail` arman las
 * candidatas para el mensaje de error.
 */
export function resolveByName<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
  getId: (item: T) => string,
  getDetail?: (item: T) => string | undefined,
): ResolveResult<T> {
  const byId = items.find((item) => getId(item) === query);
  if (byId && looksLikeId(query)) {
    return resolved(getId(byId), byId);
  }

  const matches = matchByName(query, items, getName);
  if (matches.length === 1) {
    return resolved(getId(matches[0]), matches[0]);
  }
  const pool = matches.length > 0 ? matches : items;
  const candidates: ResolveCandidate[] = pool.map((item) => ({
    id: getId(item),
    label: getName(item),
    detail: getDetail?.(item),
  }));
  return matches.length > 1 ? ambiguous(candidates) : notFound(candidates);
}
