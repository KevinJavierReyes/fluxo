import { SetMetadata } from '@nestjs/common';
import type { McpScope } from '../../oauth/oauth.constants';

export const MCP_SCOPES_KEY = 'mcpScopes';

/** Declara el/los scope(s) que exige un handler del servidor MCP. */
export const McpScopes = (...scopes: McpScope[]) =>
  SetMetadata(MCP_SCOPES_KEY, scopes);
