// Tipos del lado del cliente que reflejan la forma real de la respuesta JSON
// de la API. Los Decimal de Prisma se convierten a number en el borde de la
// API (ver DecimalToNumberInterceptor), así que todos los montos llegan como
// number — igual que los endpoints calculados (dashboard, cashflow).

import type {
  AccountType,
  CategoryType,
  OverviewGranularity,
  RecurrenceFrequency,
  TransactionType,
} from '@fluxo/shared';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
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
  color: string;
  icon: string;
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
  amount: number;
  date: string;
  description: string | null;
  source: 'MANUAL' | 'RECURRING' | 'TEMPLATE' | 'SAVINGS' | 'MCP';
}

export interface RecurringRule {
  id: string;
  name: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
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
  suggestedAmount: number | null;
  accountId: string | null;
  categoryId: string;
  type: TransactionType;
  isArchived: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  isArchived: boolean;
  progress: number;
}

export interface Budget {
  id: string;
  categoryGroupId: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isArchived: boolean;
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
  totalAmount: number;
  monthlyPayment: number;
  remainingMonths: number | null;
  interestRate: number | null;
  description: string | null;
  isPaidOff: boolean;
  linkedRecurringRuleId: string | null;
  isArchived: boolean;
}

export interface Asset {
  id: string;
  name: string;
  estimatedValue: number;
  maxSaleTimeDays: number | null;
  notes: string | null;
  isSold: boolean;
  soldAt: string | null;
  isArchived: boolean;
}

export interface Me {
  id: string;
  email: string;
  timezone: string;
  mcpEnabled: boolean;
  mcpMaxTransactionAmount: number | null;
  mcpAllowDelete: boolean;
  mcpAllowConfigWrite: boolean;
}

export interface McpConnection {
  clientId: string;
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
}

export interface McpPat {
  id: string;
  name: string | null;
  prefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreatedMcpPat extends McpPat {
  /** Solo viene en la respuesta de creación — no se puede volver a consultar después. */
  token: string;
}

export interface McpActivityEntry {
  id: string;
  tool: string;
  status: 'OK' | 'ERROR' | 'DENIED';
  errorCode: string | null;
  entityType: string | null;
  entityId: string | null;
  clientName: string | null;
  durationMs: number | null;
  undoneAt: string | null;
  canUndo: boolean;
  createdAt: string;
}

export interface OverviewWallet {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface OverviewBalanceBucket {
  bucket: string;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expense: number;
  isNegative: boolean;
  isFuture: boolean;
}

export interface OverviewChangesBucket {
  bucket: string;
  income: number;
  expense: number;
  net: number;
  isFuture: boolean;
}

export interface OverviewGroupBreakdown {
  groupId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface Overview {
  today: string;
  hasFuture: boolean;
  granularity: OverviewGranularity;
  totalBalance: number;
  wallets: OverviewWallet[];
  totals: {
    endingBalance: number;
    periodChange: number;
    periodIncome: number;
    periodExpenses: number;
    transactionCount: number;
  };
  balanceSeries: OverviewBalanceBucket[];
  changesSeries: OverviewChangesBucket[];
  incomeByGroup: OverviewGroupBreakdown[];
  expenseByGroup: OverviewGroupBreakdown[];
  amountRange: { min: number; max: number };
  projection: {
    startingBalance: number;
    points: CashflowDayPoint[];
    negativeDays: string[];
  };
}
