import { deleteRecurringExpenseTool } from './delete-recurring-expense.tool';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';
import type { McpPolicyService } from '../policy/mcp-policy.service';

const rule = { id: 'rule-1', name: 'Alquiler' };

function makeDeps() {
  const recurringRulesService = {
    findAll: jest.fn().mockResolvedValue([rule]),
    remove: jest.fn().mockResolvedValue({ id: rule.id, action: 'deleted' }),
  };
  const policyService = {
    getPolicy: jest.fn().mockResolvedValue({
      maxTransactionAmount: null,
      allowDelete: true,
      allowConfigWrite: true,
    }),
    assertConfigWriteAllowed: jest.fn(
      (policy: { allowConfigWrite: boolean }) => {
        if (!policy.allowConfigWrite) throw new Error('config write disabled');
      },
    ),
  };
  return {
    recurringRulesService:
      recurringRulesService as unknown as RecurringRulesService,
    policyService: policyService as unknown as McpPolicyService,
    mocks: { recurringRulesService, policyService },
  };
}

describe('deleteRecurringExpenseTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('resuelve por nombre y borra', async () => {
    const deps = makeDeps();
    const tool = deleteRecurringExpenseTool(deps);

    const result = await tool.handler(
      { ruleName: 'Alquiler', confirm: true },
      ctx,
    );

    expect(deps.mocks.recurringRulesService.remove).toHaveBeenCalledWith(
      'user-1',
      'rule-1',
    );
    expect(result.entityId).toBe('rule-1');
  });

  it('respeta allowConfigWrite=false antes de resolver el nombre', async () => {
    const deps = makeDeps();
    deps.mocks.policyService.getPolicy.mockResolvedValue({
      maxTransactionAmount: null,
      allowDelete: true,
      allowConfigWrite: false,
    });
    const tool = deleteRecurringExpenseTool(deps);

    await expect(
      tool.handler({ ruleName: 'Alquiler', confirm: true }, ctx),
    ).rejects.toThrow('config write disabled');
    expect(deps.mocks.recurringRulesService.findAll).not.toHaveBeenCalled();
  });
});
