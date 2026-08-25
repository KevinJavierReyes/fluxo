import type { AccountType } from '@fluxo/shared';
import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  type LucideIcon,
  WalletIcon,
} from 'lucide-react';

export const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; icon: LucideIcon }
> = {
  BANK: { label: 'Banco', icon: LandmarkIcon },
  CASH: { label: 'Efectivo', icon: BanknoteIcon },
  CREDIT_CARD: { label: 'Tarjeta de crédito', icon: CreditCardIcon },
  OTHER: { label: 'Otro', icon: WalletIcon },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: ACCOUNT_TYPE_META.BANK.label,
  CASH: ACCOUNT_TYPE_META.CASH.label,
  CREDIT_CARD: ACCOUNT_TYPE_META.CREDIT_CARD.label,
  OTHER: ACCOUNT_TYPE_META.OTHER.label,
};
