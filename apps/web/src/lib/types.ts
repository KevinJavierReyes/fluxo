// Tipos del lado del cliente que reflejan la forma real de la respuesta JSON
// de la API (los Decimal de Prisma serializan como string, no number).

import type {
  AccountType,
  CategoryType,
  RecurrenceFrequency,
  TransactionType,
} from '@fluxo/shared';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: string;
  openingBalanceDate: string;
  isArchived: boolean;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  type: CategoryType;
  sortOrder: number;
  isArchived: boolean;
  categories: Category[];
}

export interface CashflowDayPoint {
  date: string;
  income: number;
  expense: number;
  openingBalance: number;
  closingBalance: number;
  isNegative: boolean;
}

export interface DashboardSummary {
  totalBalance: number;
  accounts: { id: string; name: string; balance: number }[];
  projection: {
    startingBalance: number;
    points: CashflowDayPoint[];
    negativeDays: string[];
  };
  categoryBreakdown: { name: string; amount: number }[];
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  date: string;
  description: string | null;
  source: 'MANUAL' | 'RECURRING' | 'TEMPLATE';
}

export interface RecurringRule {
  id: string;
  name: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  description: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  byMonthDay: number | null;
  byWeekday: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastGeneratedUntil: string | null;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  suggestedAmount: string | null;
  accountId: string | null;
  categoryId: string;
  type: TransactionType;
  isArchived: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  targetDate: string | null;
  isArchived: boolean;
  progress: number;
}

export interface Budget {
  id: string;
  categoryGroupId: string;
  amount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface BudgetStatus {
  categoryGroupId: string;
  categoryGroupName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export interface Obligation {
  id: string;
  creditorName: string;
  totalAmount: string;
  monthlyPayment: string;
  remainingMonths: number | null;
  interestRate: string | null;
  description: string | null;
  isPaidOff: boolean;
  linkedRecurringRuleId: string | null;
}

export interface Asset {
  id: string;
  name: string;
  estimatedValue: string;
  maxSaleTimeDays: number | null;
  notes: string | null;
  isSold: boolean;
  soldAt: string | null;
}
