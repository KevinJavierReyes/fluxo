'use client';

import { PencilIcon } from 'lucide-react';
import { useAccounts, useDeleteAccount } from '@/hooks/use-accounts';
import { QueryError } from '@/components/query-error';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import { AccountFormDialog } from '@/components/account-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-type';
import { formatCurrency } from '@/lib/format';

export default function AccountsPage() {
  const { data: accounts, isLoading, isError } = useAccounts();
  const deleteAccount = useDeleteAccount();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cuentas"
        description="Bancos, efectivo y tarjetas donde registras tus movimientos."
        action={<AccountFormDialog />}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <QueryError message="No se pudieron cargar tus cuentas." />}

      {accounts && accounts.length === 0 && (
        <EmptyState message="Aún no tienes cuentas. Crea la primera con el botón de arriba." />
      )}

      {accounts && accounts.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between px-4 py-3 first:pt-4 last:pb-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{account.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Saldo inicial {formatCurrency(Number(account.openingBalance))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <AccountFormDialog
                    account={account}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Editar cuenta"
                      >
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton
                    aria-label="Eliminar cuenta"
                    description="Si la cuenta tiene movimientos se archivará para no romper tu historial; si no, se eliminará de forma permanente."
                    onConfirm={() => deleteAccount.mutate(account.id)}
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
