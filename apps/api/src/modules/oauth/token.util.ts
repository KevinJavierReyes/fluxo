import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Tokens opacos (no JWT): el secreto nunca se decodifica, solo se hashea y
 * se busca por hash en la base. Eso hace la revocación inmediata (borrar o
 * marcar la fila) sin necesitar una denylist aparte — algo que sí haría
 * falta con JWT firmados, donde revocar antes de que expiren exige
 * mantener una lista separada de todos modos.
 */
export function generateOpaqueToken(prefix: string): {
  raw: string;
  hash: string;
  displayPrefix: string;
} {
  const secret = randomBytes(32).toString('base64url');
  const raw = `${prefix}${secret}`;
  return {
    raw,
    hash: hashToken(raw),
    displayPrefix: `${prefix}${secret.slice(0, 6)}`,
  };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Comparación en tiempo constante para no filtrar el hash por timing. */
export function safeEqualHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function generateAuthorizationCode(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}
