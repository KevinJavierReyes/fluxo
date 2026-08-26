import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { AssetsModule } from '../assets/assets.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CashflowModule } from '../cashflow/cashflow.module';
import { CategoriesModule } from '../categories/categories.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExpenseTemplatesModule } from '../expense-templates/expense-templates.module';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { ObligationsModule } from '../obligations/obligations.module';
import { RecurringRulesModule } from '../recurring-rules/recurring-rules.module';
import { SavingsGoalsModule } from '../savings-goals/savings-goals.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { McpAuditService } from './audit/mcp-audit.service';
import { McpAuthGuard } from './guards/mcp-auth.guard';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { McpPolicyService } from './policy/mcp-policy.service';
import { PromptRegistryService } from './prompts/prompt-registry.service';
import { AccountResolver } from './resolvers/account.resolver';
import { CategoryResolver } from './resolvers/category.resolver';
import { resourceRegistryProvider } from './tools/generic/resource-registry.provider';
import { ToolRegistryService } from './tools/tool-registry.service';
import { McpUndoService } from './undo/mcp-undo.service';

@Module({
  imports: [
    AccountsModule,
    CategoriesModule,
    AssetsModule,
    ObligationsModule,
    BudgetsModule,
    SavingsGoalsModule,
    ExpenseTemplatesModule,
    RecurringRulesModule,
    TransactionsModule,
    DashboardModule,
    CashflowModule,
    NetWorthModule,
  ],
  controllers: [McpController],
  providers: [
    McpAuthGuard,
    McpServerFactory,
    ToolRegistryService,
    PromptRegistryService,
    AccountResolver,
    CategoryResolver,
    McpPolicyService,
    McpAuditService,
    resourceRegistryProvider,
    McpUndoService,
  ],
  exports: [McpAuthGuard, McpUndoService],
})
export class McpModule {}
