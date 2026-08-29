import { recordTransactionsBatchTool } from './record-transactions-batch.tool';
import type { RecordTransactionDeps } from './record-transaction.tool';

const account = {
  id: 'acc-1',
  name: 'Principal',
  type: 'BANK',
  isArchived: false,
};
const category = { id: 'cat-1', name: 'Mercado', type: 'EXPENSE' as const };

function makeDeps() {
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
  let nextId = 1;
  const transactionsService = {
    create: jest
      .fn()
      .mockImplementation((_userId: string, dto: Record<string, unknown>) =>
        Promise.resolve({
          transaction: { id: `tx-${nextId++}`, ...dto },
          alreadyExisted: false,
        }),
      ),
  };
  const policyService = {
    getPolicy: jest.fn().mockResolvedValue({
      maxTransactionAmount: null,
      allowDelete: true,
      allowConfigWrite: true,
    }),
    assertAmountWithinLimit: jest.fn(),
  };
  return {
    accountResolver,
    categoryResolver,
    transactionsService,
    policyService,
    deps: {
      accountResolver,
      categoryResolver,
      transactionsService,
      policyService,
    } as unknown as RecordTransactionDeps,
  };
}

describe('recordTransactionsBatchTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('registra todos los ítems y pide la policy una sola vez para todo el batch', async () => {
    const { deps, policyService } = makeDeps();
    const tool = recordTransactionsBatchTool(deps);

    const result = await tool.handler(
      {
        items: [
          {
            type: 'EXPENSE',
            amount: 10,
            date: '2026-08-29',
            accountName: 'Principal',
            categoryName: 'Mercado',
          },
          {
            type: 'EXPENSE',
            amount: 20,
            date: '2026-08-29',
            accountName: 'Principal',
            categoryName: 'Mercado',
          },
        ],
      },
      ctx,
    );

    expect(policyService.getPolicy).toHaveBeenCalledTimes(1);
    const results = result.structuredContent!.results as { ok: boolean }[];
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(result.content[0].text).toContain(
      '2 de 2 transacción(es) registrada(s)',
    );
  });

  it('sigue procesando los demás ítems cuando uno falla (best-effort, no atómico)', async () => {
    const { deps, categoryResolver } = makeDeps();
    categoryResolver.resolve
      .mockResolvedValueOnce({
        status: 'resolved',
        id: category.id,
        entity: category,
      })
      .mockResolvedValueOnce({ status: 'not_found', candidates: [] });
    const tool = recordTransactionsBatchTool(deps);

    const result = await tool.handler(
      {
        items: [
          {
            type: 'EXPENSE',
            amount: 10,
            date: '2026-08-29',
            accountName: 'Principal',
            categoryName: 'Mercado',
          },
          {
            type: 'EXPENSE',
            amount: 20,
            date: '2026-08-29',
            accountName: 'Principal',
            categoryName: 'No existe',
          },
        ],
      },
      ctx,
    );

    const results = result.structuredContent!.results as { ok: boolean }[];
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(result.content[0].text).toContain(
      '1 de 2 transacción(es) registrada(s), 1 fallaron',
    );
    expect(result.content[0].text).toContain('[FALLÓ]');
  });
});
