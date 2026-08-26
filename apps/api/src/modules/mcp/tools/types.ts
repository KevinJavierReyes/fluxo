import type { ZodRawShape } from 'zod';
import type { McpScope } from '../../oauth/oauth.constants';

/** Lo que cada handler de tool conoce sobre quién está llamando, cerrado por request (servidor MCP stateless por request). */
export interface ToolUserContext {
  userId: string;
  timezone: string;
}

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolCallResult {
  [key: string]: unknown;
  content: ToolTextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  /**
   * Metadata solo para auditoría — el factory la lee para McpAuditLog y la
   * quita antes de mandar la respuesta por el wire (no forma parte del
   * protocolo MCP).
   */
  entityType?: string;
  entityId?: string;
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDefinition<Args extends ZodRawShape = ZodRawShape> {
  name: string;
  requiredScope: McpScope;
  config: {
    title?: string;
    description: string;
    inputSchema?: Args;
    outputSchema?: ZodRawShape;
    annotations?: ToolAnnotations;
  };
  /** Recibe los argumentos ya validados por el SDK contra `inputSchema`. */
  handler: (
    args: Record<string, unknown>,
    ctx: ToolUserContext,
  ) => Promise<ToolCallResult>;
}

export function textResult(
  text: string,
  structuredContent?: Record<string, unknown>,
): ToolCallResult {
  return {
    content: [{ type: 'text', text }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

/** Igual que textResult, pero marcando qué entidad tocó esta llamada (para McpAuditLog). */
export function entityResult(
  text: string,
  entityType: string,
  entityId: string,
  structuredContent?: Record<string, unknown>,
): ToolCallResult {
  return { ...textResult(text, structuredContent), entityType, entityId };
}
