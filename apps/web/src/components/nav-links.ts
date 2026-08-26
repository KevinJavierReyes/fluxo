import {
  ArrowLeftRight,
  CreditCard,
  FileClock,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Plug,
  Repeat,
  Tags,
  Target,
  Wallet,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Cuentas', icon: Wallet },
  { href: '/categories', label: 'Categorías', icon: Tags },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/recurring-rules', label: 'Gastos programados', icon: Repeat },
  { href: '/expense-templates', label: 'Gastos frecuentes', icon: FileClock },
  { href: '/savings-goals', label: 'Ahorros', icon: PiggyBank },
  { href: '/budgets', label: 'Presupuestos', icon: Target },
  { href: '/obligations', label: 'Obligaciones', icon: CreditCard },
  { href: '/assets', label: 'Activos', icon: Landmark },
  { href: '/settings/integrations', label: 'Integraciones', icon: Plug },
];
