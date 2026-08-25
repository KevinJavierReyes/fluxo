export const AccountType = {
  BANK: "BANK",
  CASH: "CASH",
  CREDIT_CARD: "CREDIT_CARD",
  OTHER: "OTHER",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const CategoryType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionSource = {
  MANUAL: "MANUAL",
  RECURRING: "RECURRING",
  TEMPLATE: "TEMPLATE",
} as const;
export type TransactionSource = (typeof TransactionSource)[keyof typeof TransactionSource];

export const RecurrenceFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
  CUSTOM: "CUSTOM",
} as const;
export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];
