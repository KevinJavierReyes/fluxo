import { getUpcomingBillsTool } from './get-upcoming-bills.tool';
import type { TransactionsService } from '../../transactions/transactions.service';

function daysFromNowUtc(days: number): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  );
}

function pendingTx(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    date: daysFromNowUtc(3),
    amount: 10,
    type: 'EXPENSE',
    description: null,
    recurringRuleId: 'r1',
    recurringRule: { name: 'Suscripción' },
    account: { name: 'Principal' },
    category: { name: 'Streaming' },
    ...overrides,
  };
}

describe('getUpcomingBillsTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('lista las PENDING con su id, ordenadas por fecha, y marca las vencidas', async () => {
    const transactionsService = {
      findAll: jest.fn().mockResolvedValue({
        items: [
          pendingTx({ id: 'tx-late', date: daysFromNowUtc(5) }),
          pendingTx({
            id: 'tx-overdue',
            date: daysFromNowUtc(-2),
            description: null,
          }),
        ],
        nextCursor: null,
        hasMore: false,
      }),
    };
    const tool = getUpcomingBillsTool({
      transactionsService:
        transactionsService as unknown as TransactionsService,
    });

    const result = await tool.handler({ days: 7 }, ctx);

    const text = result.content[0].text;
    expect(text).toContain('Suscripción');
    expect(text).toContain('id=tx-late');
    expect(text).toContain('id=tx-overdue');
    expect(text).toContain('[VENCIDA]');
    const bills = result.structuredContent!.bills as {
      id: string;
      overdue: boolean;
    }[];
    expect(bills.map((b) => b.id)).toEqual(['tx-overdue', 'tx-late']);
    expect(bills[0].overdue).toBe(true);
    expect(bills[1].overdue).toBe(false);
  });

  it('pide solo transacciones PENDING hasta el horizonte', async () => {
    const transactionsService = {
      findAll: jest
        .fn()
        .mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    };
    const tool = getUpcomingBillsTool({
      transactionsService:
        transactionsService as unknown as TransactionsService,
    });

    const result = await tool.handler({ days: 7 }, ctx);

    const calls = transactionsService.findAll.mock.calls as [
      string,
      { status: string[]; to: Date; from?: Date },
    ][];
    const query = calls[0][1];
    expect(query.status).toEqual(['PENDING']);
    expect(query.to.getTime()).toBe(daysFromNowUtc(7).getTime());
    expect(query.from).toBeUndefined();
    expect(result.content[0].text).toContain('No hay vencimientos proyectados');
  });
});
