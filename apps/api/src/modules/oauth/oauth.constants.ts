import { MCP_SCOPES } from '@fluxo/shared';
import type { McpScope } from '@fluxo/shared';

// Los scopes viven en @fluxo/shared (única fuente de verdad, la usa también
// la web para renderizar el formulario de creación de tokens) — acá solo se
// re-exportan para no tocar todos los imports existentes de este archivo.
export { MCP_SCOPES };
export type { McpScope };

export function isMcpScope(value: string): value is McpScope {
  return (MCP_SCOPES as readonly string[]).includes(value);
}

export const OAUTH_CODE_TTL_MS = 60 * 1000; // 60s, RFC 8252 / OAuth 2.1
export const OAUTH_AUTHORIZATION_REQUEST_TTL_MS = 10 * 60 * 1000; // 10min
export const OAUTH_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
export const OAUTH_REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 días

export const TOKEN_PREFIX = {
  ACCESS: 'flx_at_',
  REFRESH: 'flx_rt_',
  PAT: 'flx_pat_',
} as const;
