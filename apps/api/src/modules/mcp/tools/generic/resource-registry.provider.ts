import type { Provider } from '@nestjs/common';
import { AccountsService } from '../../../accounts/accounts.service';
import { AssetsService } from '../../../assets/assets.service';
import { BudgetsService } from '../../../budgets/budgets.service';
import { CategoriesService } from '../../../categories/categories.service';
import { ExpenseTemplatesService } from '../../../expense-templates/expense-templates.service';
import { ObligationsService } from '../../../obligations/obligations.service';
import { RecurringRulesService } from '../../../recurring-rules/recurring-rules.service';
import { SavingsGoalsService } from '../../../savings-goals/savings-goals.service';
import { buildResourceRegistry } from './resource-registry';

/** Token de inyección para el registry ya armado — un solo lugar lo construye, ToolRegistryService y McpUndoService lo comparten. */
export const RESOURCE_REGISTRY = Symbol('RESOURCE_REGISTRY');

export const resourceRegistryProvider: Provider = {
  provide: RESOURCE_REGISTRY,
  useFactory: (
    accountsService: AccountsService,
    categoriesService: CategoriesService,
    assetsService: AssetsService,
    obligationsService: ObligationsService,
    budgetsService: BudgetsService,
    savingsGoalsService: SavingsGoalsService,
    expenseTemplatesService: ExpenseTemplatesService,
    recurringRulesService: RecurringRulesService,
  ) =>
    buildResourceRegistry({
      accountsService,
      categoriesService,
      assetsService,
      obligationsService,
      budgetsService,
      savingsGoalsService,
      expenseTemplatesService,
      recurringRulesService,
    }),
  inject: [
    AccountsService,
    CategoriesService,
    AssetsService,
    ObligationsService,
    BudgetsService,
    SavingsGoalsService,
    ExpenseTemplatesService,
    RecurringRulesService,
  ],
};
