import { createRecurringExpenseTool } from './create-recurring-expense.tool';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';

const account = {
  id: 'acc-1',
  name: 'Principal',
  type: 'BANK',
  isArchived: false,
};
const category = { id: 'cat-1', name: 'Mercado', type: 'EXPENSE' as const };

function makeDeps(overrides?: { maxTransactionAmount?: number | null }) {
  const accountResolver = {
    resolve: jest.fn().mockResolvedValue({
      status: 'resolved',
      id: account.id,
      entity: account,
    }),
  };
  const categoryResolver = {
    resolve: jest.fn().mockResolvedValue({
      status: 'resolved',
      id: category.id,
      entity: category,
    }),
  };
  const recurringRulesService = {
    create: jest
      .fn()
      .mockImplementation((_userId: string, dto: Record<string, unknown>) =>
        Promise.resolve({
          id: 'rule-1',
          ...dto,
        }),
      ),
  };
  const policyService = {
    getPolicy: jest.fn().mockResolvedValue({
      maxTransactionAmount: overrides?.maxTransactionAmount ?? null,
      allowDelete: true,
      allowConfigWrite: true,
    }),
    assertConfigWriteAllowed: jest.fn(
      (policy: { allowConfigWrite: boolean }) => {
        if (!policy.allowConfigWrite) throw new Error('config write disabled');
      },
    ),
    assertAmountWithinLimit: jest.fn(
      (policy: { maxTransactionAmount: number | null }, amount: number) => {
        if (
          policy.maxTransactionAmount != null &&
          amount > policy.maxTransactionAmount
        ) {
          throw new Error('amount over limit');
        }
      },
    ),
  };
  return {
    accountResolver: accountResolver as unknown as AccountResolver,
    categoryResolver: categoryResolver as unknown as CategoryResolver,
    recurringRulesService:
      recurringRulesService as unknown as RecurringRulesService,
    policyService: policyService as unknown as McpPolicyService,
    mocks: {
      accountResolver,
      categoryResolver,
      recurringRulesService,
      policyService,
    },
  };
}

describe('createRecurringExpenseTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('resuelve cuenta/categoría por nombre y crea la regla con byMonthDay/byWeekday mapeados', async () => {
    const deps = makeDeps();
    const tool = createRecurringExpenseTool(deps);

    const result = await tool.handler(
      {
        name: 'Alquiler',
        amount: 100,
        accountName: 'Principal',
        categoryName: 'Mercado',
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        interval: 1,
        startDate: '2026-01-01',
        dayOfMonth: 5,
      },
      ctx,
    );

    expect(deps.mocks.recurringRulesService.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        byMonthDay: 5,
        accountId: 'acc-1',
        categoryId: 'cat-1',
      }),
    );
    expect(result.entityType).toBe('recurring_rule');
    expect(result.entityId).toBe('rule-1');
    expect(result.content[0].text).toContain('Alquiler');
  });

  it('rechaza MONTHLY sin dayOfMonth (refine del schema compartido)', async () => {
    const deps = makeDeps();
    const tool = createRecurringExpenseTool(deps);

    await expect(
      tool.handler(
        {
          name: 'Alquiler',
          amount: 100,
          accountName: 'Principal',
          categoryName: 'Mercado',
          type: 'EXPENSE',
          frequency: 'MONTHLY',
          startDate: '2026-01-01',
        },
        ctx,
      ),
    ).rejects.toThrow();
    expect(deps.mocks.recurringRulesService.create).not.toHaveBeenCalled();
  });

  it('rechaza un monto por encima del límite de policy antes de resolver cuenta/categoría', async () => {
    const deps = makeDeps({ maxTransactionAmount: 50 });
    const tool = createRecurringExpenseTool(deps);

    await expect(
      tool.handler(
        {
          name: 'Alquiler',
          amount: 100,
          accountName: 'Principal',
          categoryName: 'Mercado',
          type: 'EXPENSE',
          frequency: 'DAILY',
          startDate: '2026-01-01',
        },
        ctx,
      ),
    ).rejects.toThrow('amount over limit');
    expect(deps.mocks.accountResolver.resolve).not.toHaveBeenCalled();
  });
});
