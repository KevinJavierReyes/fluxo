import { getUpcomingBillsTool } from './get-upcoming-bills.tool';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';

function daysFromNowUtc(days: number): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  );
}

describe('getUpcomingBillsTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('incluye una regla DIARIA activa dentro del horizonte, ordenada por fecha', async () => {
    const activeRule = {
      id: 'r1',
      name: 'Suscripción',
      amount: 10,
      type: 'EXPENSE',
      frequency: 'DAILY',
      interval: 1,
      byMonthDay: null,
      byWeekday: null,
      startDate: daysFromNowUtc(-30),
      endDate: null,
      isActive: true,
      account: { name: 'Principal' },
      category: { name: 'Streaming' },
    };
    const recurringRulesService = {
      findAll: jest.fn().mockResolvedValue([activeRule]),
    };
    const tool = getUpcomingBillsTool({
      recurringRulesService:
        recurringRulesService as unknown as RecurringRulesService,
    });

    const result = await tool.handler({ days: 7 }, ctx);

    expect(result.content[0].text).toContain('Suscripción');
    expect(result.content[0].text).toContain('Streaming');
    const bills = result.structuredContent!.bills as { date: Date }[];
    expect(bills.length).toBeGreaterThanOrEqual(7);
  });

  it('ignora reglas pausadas (isActive:false)', async () => {
    const pausedRule = {
      id: 'r2',
      name: 'Pausada',
      amount: 10,
      type: 'EXPENSE',
      frequency: 'DAILY',
      interval: 1,
      byMonthDay: null,
      byWeekday: null,
      startDate: daysFromNowUtc(-30),
      endDate: null,
      isActive: false,
      account: { name: 'Principal' },
      category: { name: 'Otros' },
    };
    const recurringRulesService = {
      findAll: jest.fn().mockResolvedValue([pausedRule]),
    };
    const tool = getUpcomingBillsTool({
      recurringRulesService:
        recurringRulesService as unknown as RecurringRulesService,
    });

    const result = await tool.handler({ days: 7 }, ctx);

    expect(result.content[0].text).toContain('No hay vencimientos proyectados');
  });
});
