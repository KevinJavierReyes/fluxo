import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZodRawShape } from 'zod';
import type { McpScope } from '../../oauth/oauth.constants';
import type { ToolUserContext } from '../tools/types';

export interface PromptDefinition<Args extends ZodRawShape = ZodRawShape> {
  name: string;
  requiredScope: McpScope;
  config: {
    title?: string;
    description?: string;
    argsSchema?: Args;
  };
  /** Los argumentos de un prompt siempre llegan como string (los rellena el cliente en un formulario) — el handler los interpreta/valida él mismo. */
  handler: (
    args: Record<string, string | undefined>,
    ctx: ToolUserContext,
  ) => GetPromptResult;
}

export function userMessage(text: string): GetPromptResult {
  return { messages: [{ role: 'user', content: { type: 'text', text } }] };
}
