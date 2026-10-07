'use client';

import { TransactionStatus } from '@fluxo/shared';
import { CheckIcon, SkipForwardIcon, Undo2Icon } from 'lucide-react';
import { ConfirmTransactionDialog } from '@/components/confirm-transaction-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account, Transaction } from '@/lib/types';

export type StatusFilter = 'all' | 'pending' | 'confirmed' | 'skipped';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Todas',
  pending: 'Pendientes',
  confirmed: 'Confirmadas',
  skipped: 'Saltadas',
};

/** `undefined` = sin filtro explícito: la API devuelve confirmadas y pendientes, y oculta las saltadas. */
export const STATUS_FILTER_VALUES: Record<StatusFilter, TransactionStatus[] | undefined> = {
  all: undefined,
  pending: [TransactionStatus.PENDING],
  confirmed: [TransactionStatus.CONFIRMED],
  skipped: [TransactionStatus.SKIPPED],
};

export function StatusFilterSelect({
  value,
  onValueChange,
  triggerClassName = 'w-40',
}: {
  value: StatusFilter;
  onValueChange: (value: StatusFilter) => void;
  triggerClassName?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange((v as StatusFilter | null) ?? value)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue>{(v: StatusFilter) => STATUS_FILTER_LABELS[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => (
          <SelectItem key={key} value={key}>
            {STATUS_FILTER_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Una PENDING cuya fecha ya pasó: se proyecta como si se pagara hoy, pero hay que confirmarla o saltarla. */
export function isOverdue(transaction: Transaction, todayIso: string): boolean {
  return transaction.status === TransactionStatus.PENDING && transaction.date.slice(0, 10) < todayIso;
}

/** Chip que distingue una transacción proyectada o saltada de una real; no muestra nada para las confirmadas. */
export function TransactionStatusBadge({ transaction, todayIso }: { transaction: Transaction; todayIso: string }) {
  if (transaction.status === TransactionStatus.PENDING) {
    return isOverdue(transaction, todayIso) ? (
      <Badge variant="destructive" className="h-4 shrink-0 px-1.5 text-[10px]">
        Vencida
      </Badge>
    ) : (
      <Badge variant="warning" className="h-4 shrink-0 px-1.5 text-[10px]">
        Pendiente
      </Badge>
    );
  }
  if (transaction.status === TransactionStatus.SKIPPED) {
    return (
      <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
        Saltada
      </Badge>
    );
  }
  return null;
}

/** Confirmar / Saltar una PENDING, o Reabrir una SKIPPED. Para las confirmadas no renderiza nada. */
export function TransactionStatusActions({
  transaction,
  accounts,
  onSetStatus,
  disabled,
}: {
  transaction: Transaction;
  accounts: Account[] | undefined;
  onSetStatus: (transaction: Transaction, status: TransactionStatus) => void;
  disabled?: boolean;
}) {
  if (transaction.status === TransactionStatus.PENDING) {
    return (
      <>
        <ConfirmTransactionDialog
          transaction={transaction}
          accounts={accounts}
          trigger={
            <Button type="button" variant="outline" size="xs" aria-label="Confirmar transacción">
              <CheckIcon />
              Confirmar
            </Button>
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Saltar transacción"
          disabled={disabled}
          onClick={() => onSetStatus(transaction, TransactionStatus.SKIPPED)}
        >
          <SkipForwardIcon />
          Saltar
        </Button>
      </>
    );
  }
  if (transaction.status === TransactionStatus.SKIPPED) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Reabrir transacción"
        disabled={disabled}
        onClick={() => onSetStatus(transaction, TransactionStatus.PENDING)}
      >
        <Undo2Icon />
        Reabrir
      </Button>
    );
  }
  return null;
}
