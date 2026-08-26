'use client';

import { KeyRoundIcon } from 'lucide-react';
import { useMcpPats, useRevokeMcpPat } from '@/hooks/use-mcp-settings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { CreatePatDialog } from '@/components/mcp/create-pat-dialog';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { MCP_SCOPE_META } from '@/lib/mcp-scopes';
import { formatDateTime } from '@/lib/format';
import type { McpScope } from '@fluxo/shared';

export function McpTokensCard() {
  const { data: pats, isLoading, isError } = useMcpPats();
  const revokePat = useRevokeMcpPat();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens personales</CardTitle>
        <CardDescription>
          Para conectar un cliente MCP a mano, sin pasar por el flujo de autorización de apps.
        </CardDescription>
        <CardAction>
          <CreatePatDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {isError && <QueryError message="No se pudieron cargar los tokens." />}
        {pats && pats.length === 0 && (
          <EmptyState
            icon={KeyRoundIcon}
            message="No tienes tokens personales. Crea uno con el botón de arriba."
          />
        )}
        {pats && pats.length > 0 && (
          <div className="divide-y">
            {pats.map((pat) => (
              <div
                key={pat.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{pat.name ?? 'Sin nombre'}</p>
                  <code className="text-xs text-muted-foreground">{pat.prefix}…</code>
                  <div className="flex flex-wrap items-center gap-1">
                    {pat.scopes.map((scope) => (
                      <Badge key={scope} variant="secondary">
                        {MCP_SCOPE_META[scope as McpScope]?.label ?? scope}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Creado el {formatDateTime(pat.createdAt)}
                    {pat.expiresAt
                      ? ` · Expira el ${formatDateTime(pat.expiresAt)}`
                      : ' · Sin expiración'}
                    {pat.lastUsedAt && ` · Último uso ${formatDateTime(pat.lastUsedAt)}`}
                  </p>
                </div>
                <ConfirmDeleteButton
                  aria-label="Revocar token"
                  title={`¿Revocar "${pat.name ?? 'este token'}"?`}
                  description="Deja de funcionar de inmediato. Cualquier cliente que lo use pierde acceso."
                  confirmLabel="Revocar"
                  onConfirm={() => revokePat.mutate(pat.id)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
