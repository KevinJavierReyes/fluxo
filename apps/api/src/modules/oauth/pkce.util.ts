import { createHash } from 'crypto';

/**
 * Verifica el `code_verifier` contra el `code_challenge` guardado en
 * /authorize. OAuth 2.1 exige PKCE siempre y rechaza el método `plain`
 * (solo S256) — es la defensa contra interceptación del authorization code
 * en clientes públicos (sin client_secret), que es el caso de todo cliente
 * MCP.
 */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string,
): boolean {
  if (codeChallengeMethod !== 'S256') {
    return false;
  }
  const computed = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return computed === codeChallenge;
}

export function isValidCodeChallenge(value: string): boolean {
  // base64url, 43-128 caracteres — RFC 7636 §4.2
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(value);
}
