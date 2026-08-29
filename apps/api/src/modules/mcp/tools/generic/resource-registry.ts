import {
  createAccountSchema,
  createAssetSchema,
  createBudgetSchema,
  createCategoryGroupSchema,
  createCategorySchema,
  createExpenseTemplateSchema,
  createObligationSchema,
  createRecurringRuleSchema,
  createSavingsGoalSchema,
  updateAccountSchema,
  updateAssetSchema,
  updateBudgetSchema,
  updateCategoryGroupSchema,
  updateCategorySchema,
  updateExpenseTemplateSchema,
  updateObligationSchema,
  updateRecurringRuleSchema,
  updateSavingsGoalSchema,
} from '@fluxo/shared';
import type { ZodTypeAny } from 'zod';
import type { AccountsService } from '../../../accounts/accounts.service';
import type { AssetsService } from '../../../assets/assets.service';
import type { BudgetsService } from '../../../budgets/budgets.service';
import type { CategoriesService } from '../../../categories/categories.service';
import type { ExpenseTemplatesService } from '../../../expense-templates/expense-templates.service';
import type { ObligationsService } from '../../../obligations/obligations.service';
import type { RecurringRulesService } from '../../../recurring-rules/recurring-rules.service';
import type { SavingsGoalsService } from '../../../savings-goals/savings-goals.service';

export const RESOURCE_KEYS = [
  'account',
  'category',
  'category_group',
  'asset',
  'obligation',
  'budget',
  'savings_goal',
  'expense_template',
  'recurring_rule',
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

/**
 * `recurring_rule` tiene tools dedicados (create/update/delete/list_recurring_expense)
 * porque sus campos condicionales (byMonthDay/byWeekday según frequency) son
 * frágiles para el modelo dentro de un blob `data` genérico. Se saca de acá
 * para que fluxo_list/create/update/archive no lo ofrezcan como opción — pero
 * sigue en RESOURCE_KEYS/el registry completo porque fluxo_undo necesita
 * descriptor.get/archive para poder deshacer una creación.
 */
export const GENERIC_RESOURCE_KEYS = [
  'account',
  'category',
  'category_group',
  'asset',
  'obligation',
  'budget',
  'savings_goal',
  'expense_template',
] as const;
export type GenericResourceKey = (typeof GENERIC_RESOURCE_KEYS)[number];

export interface ArchiveResult {
  id: string;
  action: 'deleted' | 'archived';
  entity: Record<string, unknown> | null;
}

export interface ResourceDescriptor {
  key: ResourceKey;
  label: string;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** Campo para mostrar como nombre en listados/búsqueda; ausente si el recurso no tiene uno natural (ej. presupuestos). */
  nameOf?: (item: Record<string, unknown>) => string;
  list: (userId: string) => Promise<Record<string, unknown>[]>;
  get: (userId: string, id: string) => Promise<Record<string, unknown>>;
  /** `data` ya validado por el caller contra `createSchema`. */
  create: (
    userId: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  /** `data` ya validado por el caller contra `updateSchema`. */
  update: (
    userId: string,
    id: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  archive: (userId: string, id: string) => Promise<ArchiveResult>;
}

export interface ResourceServices {
  accountsService: AccountsService;
  categoriesService: CategoriesService;
  assetsService: AssetsService;
  obligationsService: ObligationsService;
  budgetsService: BudgetsService;
  savingsGoalsService: SavingsGoalsService;
  expenseTemplatesService: ExpenseTemplatesService;
  recurringRulesService: RecurringRulesService;
}

export function buildResourceRegistry(
  services: ResourceServices,
): Record<ResourceKey, ResourceDescriptor> {
  const s = services;
  return {
    account: {
      key: 'account',
      label: 'cuenta',
      createSchema: createAccountSchema,
      updateSchema: updateAccountSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.accountsService.findAll(userId),
      get: (userId, id) => s.accountsService.findOne(userId, id),
      create: (userId, data) => s.accountsService.create(userId, data as never),
      update: (userId, id, data) => s.accountsService.update(userId, id, data),
      archive: (userId, id) => s.accountsService.remove(userId, id),
    },
    category: {
      key: 'category',
      label: 'categoría',
      createSchema: createCategorySchema,
      updateSchema: updateCategorySchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.categoriesService.findAllFlat(userId),
      get: (userId, id) => s.categoriesService.findOne(userId, id),
      create: (userId, data) =>
        s.categoriesService.create(userId, data as never),
      update: (userId, id, data) =>
        s.categoriesService.update(userId, id, data),
      archive: (userId, id) => s.categoriesService.remove(userId, id),
    },
    category_group: {
      key: 'category_group',
      label: 'grupo de categoría',
      createSchema: createCategoryGroupSchema,
      updateSchema: updateCategoryGroupSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.categoriesService.findAllGroups(userId),
      get: (userId, id) => s.categoriesService.findGroup(userId, id),
      create: (userId, data) =>
        s.categoriesService.createGroup(userId, data as never),
      update: (userId, id, data) =>
        s.categoriesService.updateGroup(userId, id, data),
      archive: (userId, id) => s.categoriesService.removeGroup(userId, id),
    },
    asset: {
      key: 'asset',
      label: 'activo',
      createSchema: createAssetSchema,
      updateSchema: updateAssetSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.assetsService.findAll(userId),
      get: (userId, id) => s.assetsService.findOne(userId, id),
      create: (userId, data) => s.assetsService.create(userId, data as never),
      update: (userId, id, data) => s.assetsService.update(userId, id, data),
      archive: (userId, id) => s.assetsService.remove(userId, id),
    },
    obligation: {
      key: 'obligation',
      label: 'obligación',
      createSchema: createObligationSchema,
      updateSchema: updateObligationSchema,
      nameOf: (i) => i.creditorName as string,
      list: (userId) => s.obligationsService.findAll(userId),
      get: (userId, id) => s.obligationsService.findOne(userId, id),
      create: (userId, data) =>
        s.obligationsService.create(userId, data as never),
      update: (userId, id, data) =>
        s.obligationsService.update(userId, id, data),
      archive: (userId, id) => s.obligationsService.remove(userId, id),
    },
    budget: {
      key: 'budget',
      label: 'presupuesto',
      createSchema: createBudgetSchema,
      updateSchema: updateBudgetSchema,
      // Sin nombre propio (se identifica por grupo + fecha de vigencia); no
      // participa en fluxo_search, solo en fluxo_list (y en fluxo_undo, que
      // usa `get` internamente para reportar qué se deshizo).
      list: (userId) => s.budgetsService.findAll(userId),
      get: (userId, id) => s.budgetsService.findOne(userId, id),
      create: (userId, data) => s.budgetsService.create(userId, data as never),
      update: (userId, id, data) => s.budgetsService.update(userId, id, data),
      archive: (userId, id) => s.budgetsService.remove(userId, id),
    },
    savings_goal: {
      key: 'savings_goal',
      label: 'meta de ahorro',
      createSchema: createSavingsGoalSchema,
      updateSchema: updateSavingsGoalSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.savingsGoalsService.findAll(userId),
      get: (userId, id) => s.savingsGoalsService.findOne(userId, id),
      create: (userId, data) =>
        s.savingsGoalsService.create(userId, data as never),
      update: (userId, id, data) =>
        s.savingsGoalsService.update(userId, id, data),
      archive: (userId, id) => s.savingsGoalsService.remove(userId, id),
    },
    expense_template: {
      key: 'expense_template',
      label: 'plantilla de gasto',
      createSchema: createExpenseTemplateSchema,
      updateSchema: updateExpenseTemplateSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.expenseTemplatesService.findAll(userId),
      get: (userId, id) => s.expenseTemplatesService.findOne(userId, id),
      create: (userId, data) =>
        s.expenseTemplatesService.create(userId, data as never),
      update: (userId, id, data) =>
        s.expenseTemplatesService.update(userId, id, data),
      archive: (userId, id) => s.expenseTemplatesService.remove(userId, id),
    },
    recurring_rule: {
      key: 'recurring_rule',
      label: 'regla recurrente',
      createSchema: createRecurringRuleSchema,
      updateSchema: updateRecurringRuleSchema,
      nameOf: (i) => i.name as string,
      list: (userId) => s.recurringRulesService.findAll(userId),
      get: (userId, id) => s.recurringRulesService.findOne(userId, id),
      create: (userId, data) =>
        s.recurringRulesService.create(userId, data as never),
      update: (userId, id, data) =>
        s.recurringRulesService.update(userId, id, data),
      archive: (userId, id) => s.recurringRulesService.remove(userId, id),
    },
  };
}
