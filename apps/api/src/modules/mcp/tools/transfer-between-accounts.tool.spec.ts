import { transferBetweenAccountsTool } from './transfer-between-accounts.tool';
import type { TransfersService } from '../../transfers/transfers.service';
import type { McpPolicyService } from '../policy/mcp-policy.service';
import type { AccountResolver } from '../resolvers/account.resolver';

const fromAccount = {
  id: 'acc-1',
  name: 'Ahorros',
  type: 'BANK',
  isArchived: false,
};
const toAccount = {
  id: 'acc-2',
  name: 'Corriente',
  type: 'BANK',
  isArchived: false,
};

function makeDeps(overrides?: { maxTransactionAmount?: number | null }) {
  const accountResolver = {
    resolve: jest.fn().mockImplementation((_userId: string, name: string) => {
      if (name === 'Ahorros')
        return { status: 'resolved', id: fromAccount.id, entity: fromAccount };
      if (name === 'Corriente')
        return { status: 'resolved', id: toAccount.id, entity: toAccount };
      return { status: 'not_found', candidates: [] };
    }),
  };
  const transfersService = {
    create: jest.fn().mockResolvedValue({
      transfer: { id: 'transfer-1' },
      alreadyExisted: false,
    }),
  };
  const policyService = {
    getPolicy: jest.fn().mockResolvedValue({
      maxTransactionAmount: overrides?.maxTransactionAmount ?? null,
      allowDelete: true,
      allowConfigWrite: true,
    }),
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
    transfersService: transfersService as unknown as TransfersService,
    policyService: policyService as unknown as McpPolicyService,
    mocks: { accountResolver, transfersService, policyService },
  };
}

describe('transferBetweenAccountsTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('resuelve ambas cuentas por nombre y crea la transferencia', async () => {
    const deps = makeDeps();
    const tool = transferBetweenAccountsTool(deps);

    const result = await tool.handler(
      {
        fromAccountName: 'Ahorros',
        toAccountName: 'Corriente',
        amount: 200,
        date: '2026-08-29',
      },
      ctx,
    );

    expect(deps.mocks.transfersService.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 200,
      }),
    );
    expect(result.entityType).toBe('transfer');
    expect(result.entityId).toBe('transfer-1');
    expect(result.content[0].text).toContain('Ahorros');
    expect(result.content[0].text).toContain('Corriente');
  });

  it('valida el límite de monto de policy antes de resolver las cuentas', async () => {
    const deps = makeDeps({ maxTransactionAmount: 50 });
    const tool = transferBetweenAccountsTool(deps);

    await expect(
      tool.handler(
        {
          fromAccountName: 'Ahorros',
          toAccountName: 'Corriente',
          amount: 200,
          date: '2026-08-29',
        },
        ctx,
      ),
    ).rejects.toThrow('amount over limit');
    expect(deps.mocks.accountResolver.resolve).not.toHaveBeenCalled();
  });

  it('propaga error si la cuenta de destino no existe', async () => {
    const deps = makeDeps();
    const tool = transferBetweenAccountsTool(deps);

    await expect(
      tool.handler(
        {
          fromAccountName: 'Ahorros',
          toAccountName: 'No existe',
          amount: 200,
          date: '2026-08-29',
        },
        ctx,
      ),
    ).rejects.toThrow();
    expect(deps.mocks.transfersService.create).not.toHaveBeenCalled();
  });
});
