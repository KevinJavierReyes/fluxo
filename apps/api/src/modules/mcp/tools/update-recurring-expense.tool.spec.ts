import { updateRecurringExpenseTool } from './update-recurring-expense.tool';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';
import type { CategoryResolver } from '../resolvers/category.resolver';

const rule = {
  id: 'rule-1',
  name: 'Alquiler',
  type: 'EXPENSE' as const,
  amount: 100,
};

function makeDeps() {
  const recurringRulesService = {
    findAll: jest.fn().mockResolvedValue([rule]),
    update: jest
      .fn()
      .mockImplementation(
        (_userId: string, id: string, dto: Record<string, unknown>) =>
          Promise.resolve({ ...rule, id, ...dto }),
      ),
  };
  const accountResolver = { resolve: jest.fn() };
  const categoryResolver = { resolve: jest.fn() };
  const policyService = {
    getPolicy: jest.fn().mockResolvedValue({
      maxTransactionAmount: null,
      allowDelete: true,
      allowConfigWrite: true,
    }),
    assertConfigWriteAllowed: jest.fn(),
    assertAmountWithinLimit: jest.fn(),
  };
  return {
    recurringRulesService:
      recurringRulesService as unknown as RecurringRulesService,
    accountResolver: accountResolver as unknown as AccountResolver,
    categoryResolver: categoryResolver as unknown as CategoryResolver,
    policyService: policyService as unknown as McpPolicyService,
    mocks: {
      recurringRulesService,
      accountResolver,
      categoryResolver,
      policyService,
    },
  };
}

describe('updateRecurringExpenseTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('resuelve la regla por nombre y actualiza solo los campos editables', async () => {
    const deps = makeDeps();
    const tool = updateRecurringExpenseTool(deps);

    const result = await tool.handler(
      { ruleName: 'Alquiler', amount: 150 },
      ctx,
    );

    expect(deps.mocks.recurringRulesService.update).toHaveBeenCalledWith(
      'user-1',
      'rule-1',
      expect.objectContaining({ amount: 150 }),
    );
    expect(result.entityId).toBe('rule-1');
  });

  it('valida el límite de monto cuando se edita amount', async () => {
    const deps = makeDeps();
    deps.mocks.policyService.getPolicy.mockResolvedValue({
      maxTransactionAmount: 50,
      allowDelete: true,
      allowConfigWrite: true,
    });
    deps.mocks.policyService.assertAmountWithinLimit.mockImplementation(
      (_policy: unknown, amount: number) => {
        if (amount > 50) throw new Error('amount over limit');
      },
    );
    const tool = updateRecurringExpenseTool(deps);

    await expect(
      tool.handler({ ruleName: 'Alquiler', amount: 150 }, ctx),
    ).rejects.toThrow('amount over limit');
  });

  it('propaga error si el nombre no matchea ninguna regla', async () => {
    const deps = makeDeps();
    const tool = updateRecurringExpenseTool(deps);

    await expect(
      tool.handler({ ruleName: 'No existe' }, ctx),
    ).rejects.toThrow();
    expect(deps.mocks.recurringRulesService.update).not.toHaveBeenCalled();
  });
});
