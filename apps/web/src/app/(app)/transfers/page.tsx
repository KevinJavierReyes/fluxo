'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useDeleteTransfer, useTransfers } from '@/hooks/use-transfers';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { TransferFormDialog } from '@/components/transfer-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatLongDate } from '@/lib/format';

export default function TransfersPage() {
  const { data: transfers, isLoading, isError } = useTransfers();
  const deleteTransfer = useDeleteTransfer();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Transferencias"
        description="Plata que mueves entre tus propias cuentas, como pagar una tarjeta desde el banco. No cuenta como ingreso ni gasto."
        action={<TransferFormDialog />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus transferencias." />}

      {transfers && transfers.length === 0 && (
        <EmptyState
          message="Aún no tienes transferencias."
          action={
            <TransferFormDialog trigger={<Button type="button" variant="outline">Hacer la primera</Button>} />
          }
        />
      )}

      {transfers && transfers.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex flex-col gap-2 px-4 py-3 first:pt-4 last:pb-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex min-w-0 items-center gap-2 font-medium">
                    <span className="truncate">{transfer.fromAccount.name}</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{transfer.toAccount.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatLongDate(transfer.date)}
                    {transfer.description && ` · ${transfer.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="font-medium tabular-nums">{formatCurrency(transfer.amount)}</span>
                  <ConfirmDeleteButton
                    aria-label="Eliminar transferencia"
                    description="Se revertirá el movimiento de saldo entre las dos cuentas. Esta acción no se puede deshacer."
                    onConfirm={() => deleteTransfer.mutate(transfer.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
