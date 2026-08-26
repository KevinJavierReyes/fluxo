'use client';

import { HistoryIcon, Undo2Icon } from 'lucide-react';
import { useMcpActivity, useUndoMcpActivity } from '@/hooks/use-mcp-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import type { McpActivityEntry } from '@/lib/types';

const STATUS_META: Record<McpActivityEntry['status'], { label: string; variant: 'success' | 'destructive' | 'outline' }> = {
  OK: { label: 'OK', variant: 'success' },
  ERROR: { label: 'Error', variant: 'destructive' },
  DENIED: { label: 'Denegado', variant: 'outline' },
};

export function McpActivityCard() {
  const { data: activity, isLoading, isError } = useMcpActivity();
  const undo = useUndoMcpActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>
          Últimas llamadas de agentes a tu cuenta. Las creaciones recientes sin editar después se
          pueden deshacer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {isError && <QueryError message="No se pudo cargar el log de actividad." />}
        {activity && activity.length === 0 && (
          <EmptyState icon={HistoryIcon} message="Todavía no hay actividad de agentes en tu cuenta." />
        )}
        {activity && activity.length > 0 && (
          <div className="divide-y">
            {activity.map((entry) => {
              const status = STATUS_META[entry.status];
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.tool}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {entry.undoneAt && <Badge variant="outline">Deshecho</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                      {entry.clientName && ` · ${entry.clientName}`}
                      {entry.errorCode && ` · ${entry.errorCode}`}
                    </p>
                  </div>
                  {entry.canUndo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={undo.isPending}
                      onClick={() => undo.mutate(entry.id)}
                    >
                      <Undo2Icon />
                      Deshacer
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {undo.isError && <p className="mt-3 text-sm text-destructive">{undo.error.message}</p>}
      </CardContent>
    </Card>
  );
}
