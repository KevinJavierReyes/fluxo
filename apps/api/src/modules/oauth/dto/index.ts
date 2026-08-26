import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Los nombres de campo van en snake_case a propósito, aunque el resto del
// proyecto usa camelCase: estos son los nombres exactos que exige el wire
// format de OAuth 2.1 / RFC 7591 / RFC 8707, no una elección de diseño
// nuestra. Cualquier cliente MCP externo los manda tal cual.

export const authorizeQuerySchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal('S256'),
  resource: z.string().min(1),
});
export class AuthorizeQueryDto extends createZodDto(authorizeQuerySchema) {}

export const consentBodySchema = z.object({
  requestId: z.string().min(1),
  approve: z.boolean(),
});
export class ConsentBodyDto extends createZodDto(consentBodySchema) {}

export const registerClientSchema = z.object({
  client_name: z.string().min(1).max(200),
  redirect_uris: z.array(z.string().min(1)).min(1),
  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});
export class RegisterClientDto extends createZodDto(registerClientSchema) {}

export const tokenBodySchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  // authorization_code
  code: z.string().optional(),
  redirect_uri: z.string().optional(),
  code_verifier: z.string().optional(),
  // refresh_token
  refresh_token: z.string().optional(),
  // comunes
  client_id: z.string().min(1),
  resource: z.string().optional(),
});
export class TokenBodyDto extends createZodDto(tokenBodySchema) {}

export const revokeBodySchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.string().optional(),
});
export class RevokeBodyDto extends createZodDto(revokeBodySchema) {}
