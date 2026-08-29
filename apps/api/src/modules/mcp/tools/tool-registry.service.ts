import { Inject, Injectable } from '@nestjs/common';
import { CashflowService } from '../../cashflow/cashflow.service';
import { DashboardService } from '../../dashboard/dashboard.service';
import { ExpenseTemplatesService } from '../../expense-templates/expense-templates.service';
import { NetWorthService } from '../../net-worth/net-worth.service';
import { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import { SavingsGoalsService } from '../../savings-goals/savings-goals.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransfersService } from '../../transfers/transfers.service';
import { McpPolicyService } from '../policy/mcp-policy.service';
import { AccountResolver } from '../resolvers/account.resolver';
import { CategoryResolver } from '../resolvers/category.resolver';
import { McpUndoService } from '../undo/mcp-undo.service';
import { applyExpenseTemplateTool } from './apply-expense-template.tool';
import { contributeToSavingsGoalTool } from './contribute-to-savings-goal.tool';
import { createRecurringExpenseTool } from './create-recurring-expense.tool';
import { deleteRecurringExpenseTool } from './delete-recurring-expense.tool';
import { deleteTransactionTool } from './delete-transaction.tool';
import { fluxoUndoTool } from './fluxo-undo.tool';
import { getBudgetStatusTool } from './get-budget-status.tool';
import { getCashflowProjectionTool } from './get-cashflow-projection.tool';
import { getDashboardTool } from './get-dashboard.tool';
import { getNetWorthTool } from './get-net-worth.tool';
import { getUpcomingBillsTool } from './get-upcoming-bills.tool';
import { fluxoArchiveTool } from './generic/fluxo-archive.tool';
import { fluxoCreateTool } from './generic/fluxo-create.tool';
import { fluxoListTool } from './generic/fluxo-list.tool';
import { fluxoSearchTool } from './generic/fluxo-search.tool';
import { fluxoUpdateTool } from './generic/fluxo-update.tool';
import { RESOURCE_REGISTRY } from './generic/resource-registry.provider';
import type {
  ResourceDescriptor,
  ResourceKey,
} from './generic/resource-registry';
import { listRecurringExpensesTool } from './list-recurring-expenses.tool';
import { recordTransactionTool } from './record-transaction.tool';
import { recordTransactionsBatchTool } from './record-transactions-batch.tool';
import { searchTransactionsTool } from './search-transactions.tool';
import { transferBetweenAccountsTool } from './transfer-between-accounts.tool';
import { updateRecurringExpenseTool } from './update-recurring-expense.tool';
import { updateTransactionTool } from './update-transaction.tool';
import type { ToolDefinition } from './types';
import { BudgetsService } from '../../budgets/budgets.service';

/**
 * Arma la lista completa de tools (lectura y escritura) una sola vez (los
 * services inyectados no cambian entre requests). Cada handler recibe el
 * contexto del usuario (userId/timezone) como parámetro en vez de tenerlo
 * cerrado adentro, así que esta misma lista sirve para cualquier request —
 * quien la usa (mcp-server.factory) decide con qué contexto invocar cada
 * handler, y con qué scopes filtrar cuáles se anuncian.
 */
@Injectable()
export class ToolRegistryService {
  private readonly tools: ToolDefinition[];

  constructor(
    budgetsService: BudgetsService,
    savingsGoalsService: SavingsGoalsService,
    expenseTemplatesService: ExpenseTemplatesService,
    transactionsService: TransactionsService,
    dashboardService: DashboardService,
    cashflowService: CashflowService,
    netWorthService: NetWorthService,
    recurringRulesService: RecurringRulesService,
    transfersService: TransfersService,
    accountResolver: AccountResolver,
    categoryResolver: CategoryResolver,
    policyService: McpPolicyService,
    undoService: McpUndoService,
    @Inject(RESOURCE_REGISTRY)
    registry: Record<ResourceKey, ResourceDescriptor>,
  ) {
    this.tools = [
      // Lectura
      searchTransactionsTool({
        transactionsService,
        accountResolver,
        categoryResolver,
      }),
      getDashboardTool({ dashboardService, accountResolver }),
      getCashflowProjectionTool({ cashflowService, accountResolver }),
      getBudgetStatusTool({ budgetsService }),
      getNetWorthTool({ netWorthService }),
      getUpcomingBillsTool({ recurringRulesService }),
      listRecurringExpensesTool({ recurringRulesService }),
      fluxoListTool(registry),
      fluxoSearchTool(registry),
      // Escritura
      recordTransactionTool({
        transactionsService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      updateTransactionTool({
        transactionsService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      recordTransactionsBatchTool({
        transactionsService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      deleteTransactionTool({ transactionsService, policyService }),
      applyExpenseTemplateTool({
        expenseTemplatesService,
        accountResolver,
        policyService,
      }),
      contributeToSavingsGoalTool({
        savingsGoalsService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      createRecurringExpenseTool({
        recurringRulesService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      updateRecurringExpenseTool({
        recurringRulesService,
        accountResolver,
        categoryResolver,
        policyService,
      }),
      deleteRecurringExpenseTool({ recurringRulesService, policyService }),
      transferBetweenAccountsTool({
        transfersService,
        accountResolver,
        policyService,
      }),
      fluxoCreateTool(registry, policyService),
      fluxoUpdateTool(registry, policyService),
      fluxoArchiveTool(registry, policyService),
      fluxoUndoTool({ undoService }),
    ];
  }

  getTools(): ToolDefinition[] {
    return this.tools;
  }
}
