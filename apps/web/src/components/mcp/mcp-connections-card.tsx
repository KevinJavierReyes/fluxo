'use client';

import { PlugZapIcon } from 'lucide-react';
import { useDisconnectMcpConnection, useMcpConnections } from '@/hooks/use-mcp-settings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { MCP_SCOPE_META } from '@/lib/mcp-scopes';
import { formatDateTime } from '@/lib/format';
import type { McpScope } from '@fluxo/shared';

export function McpConnectionsCard() {
  const { data: connections, isLoading, isError } = useMcpConnections();
  const disconnect = useDisconnectMcpConnection();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apps conectadas</CardTitle>
        <CardDescription>
          Clientes MCP (como Claude Desktop o Claude Code) que autorizaste a acceder a tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {isError && <QueryError message="No se pudieron cargar las apps conectadas." />}
        {connections && connections.length === 0 && (
          <EmptyState
            icon={PlugZapIcon}
            message="Todavía no conectaste ninguna app. Usa la guía de configuración para conectar Claude."
          />
        )}
        {connections && connections.length > 0 && (
          <div className="divide-y">
            {connections.map((conn) => (
              <div
                key={conn.clientId}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{conn.clientName}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {conn.scopes.map((scope) => (
                      <Badge key={scope} variant="secondary">
                        {MCP_SCOPE_META[scope as McpScope]?.label ?? scope}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conectado el {formatDateTime(conn.connectedAt)}
                    {conn.lastUsedAt && ` · Último uso ${formatDateTime(conn.lastUsedAt)}`}
                  </p>
                </div>
                <ConfirmDeleteButton
                  aria-label="Desconectar"
                  title={`¿Desconectar "${conn.clientName}"?`}
                  description="Se revocan todos sus tokens de acceso. Va a necesitar autorizarse de nuevo para volver a usar tu cuenta."
                  confirmLabel="Desconectar"
                  onConfirm={() => disconnect.mutate(conn.clientId)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
