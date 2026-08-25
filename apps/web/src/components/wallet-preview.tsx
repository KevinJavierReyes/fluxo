'use client';

import { PlusIcon } from 'lucide-react';
import { AccountFormDialog } from '@/components/account-form-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ACCOUNT_TYPE_META } from '@/lib/account-type';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OverviewWallet } from '@/lib/types';

/**
 * Vista rápida de las cuentas. Clic en una tarjeta la aplica (o la quita) como
 * filtro de wallet del overview.
 */
export function WalletPreview({
  wallets,
  selectedAccountId,
  onSelectAccount,
  isLoading,
}: {
  wallets: OverviewWallet[] | undefined;
  selectedAccountId?: string;
  onSelectAccount: (accountId: string | undefined) => void;
  isLoading?: boolean;
}) {
  if (isLoading && !wallets) {
    return (
      <div className="flex gap-3">
        <Skeleton className="h-[86px] w-52" />
        <Skeleton className="h-[86px] w-52" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {wallets?.map((wallet) => {
        const meta = ACCOUNT_TYPE_META[wallet.type] ?? ACCOUNT_TYPE_META.OTHER;
        const Icon = meta.icon;
        const isSelected = selectedAccountId === wallet.id;
        return (
          <button
            key={wallet.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() =>
              onSelectAccount(isSelected ? undefined : wallet.id)
            }
            className={cn(
              'flex min-w-[13rem] items-center gap-3 rounded-xl bg-card px-4 py-3 text-left ring-1 transition-colors',
              isSelected
                ? 'ring-2 ring-primary'
                : 'ring-foreground/10 hover:bg-muted/50',
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4.5">
              <Icon />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{wallet.name}</span>
              <span className="text-xs text-muted-foreground">{meta.label}</span>
              <span
                className={cn(
                  'mt-0.5 text-base font-semibold tabular-nums',
                  wallet.balance < 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {formatCurrency(wallet.balance)}
              </span>
            </span>
          </button>
        );
      })}

      <AccountFormDialog
        trigger={
          <button
            type="button"
            className="flex min-w-[13rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <PlusIcon className="size-4" />
            Agregar cuenta
          </button>
        }
      />
    </div>
  );
}
