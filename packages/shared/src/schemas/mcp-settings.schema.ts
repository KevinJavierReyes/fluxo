import { z } from "zod";

/**
 * Única fuente de verdad para los scopes de MCP — la API los re-exporta
 * desde acá (ver `oauth.constants.ts`) en vez de declarar su propia lista,
 * así que este archivo es el que hay que tocar si algún día se agrega un
 * scope nuevo.
 */
export const MCP_SCOPES = [
  "finances:read",
  "finances:write",
  "config:write",
] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export const createPatSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(MCP_SCOPES)).min(1),
  /** Días hasta la expiración; si se omite, el token no expira solo (hay que revocarlo a mano). */
  expiresInDays: z.coerce.number().int().positive().max(365).optional(),
});
export type CreatePatInput = z.infer<typeof createPatSchema>;
