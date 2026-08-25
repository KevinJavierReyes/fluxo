import { ArrowDownCircleIcon, ArrowUpCircleIcon } from 'lucide-react';

export const TRANSACTION_TYPE_META = {
  INCOME: { label: 'Ingreso', variant: 'success' as const, icon: ArrowUpCircleIcon },
  EXPENSE: { label: 'Egreso', variant: 'destructive' as const, icon: ArrowDownCircleIcon },
};
