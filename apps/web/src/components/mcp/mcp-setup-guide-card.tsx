'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { getMcpServerUrl } from '@/lib/mcp-url';

export function McpSetupGuideCard() {
  const url = getMcpServerUrl();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar un cliente</CardTitle>
        <CardDescription>
          La URL del servidor MCP de Fluxo. Claude Desktop y claude.ai la piden al conectar una
          integración; Claude Code la recibe como argumento.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
          <code className="flex-1 overflow-x-auto text-xs whitespace-nowrap">{url}</code>
          <CopyButton value={url} />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Claude Code (CLI)</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
            <code className="flex-1 overflow-x-auto text-xs whitespace-nowrap">
              claude mcp add --transport http fluxo {url}
            </code>
            <CopyButton value={`claude mcp add --transport http fluxo ${url}`} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          En Claude Desktop y claude.ai, el flujo de conexión pide autorización con un clic — se
          abre esta misma app para aprobar los permisos, y la conexión aparece en &quot;Apps
          conectadas&quot; una vez lista. Para clientes que no soportan ese flujo, usa un token
          personal en su lugar.
        </p>
      </CardContent>
    </Card>
  );
}
