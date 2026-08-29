import { listRecurringExpensesTool } from './list-recurring-expenses.tool';
import type { RecurringRulesService } from '../../recurring-rules/recurring-rules.service';

describe('listRecurringExpensesTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('devuelve un mensaje claro cuando no hay reglas', async () => {
    const recurringRulesService = { findAll: jest.fn().mockResolvedValue([]) };
    const tool = listRecurringExpensesTool({
      recurringRulesService:
        recurringRulesService as unknown as RecurringRulesService,
    });

    const result = await tool.handler({}, ctx);

    expect(result.content[0].text).toContain('No hay reglas recurrentes');
  });

  it('lista nombre, monto, cadencia y estado pausado en el texto, no solo el conteo', async () => {
    const recurringRulesService = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'r1',
          name: 'Alquiler',
          amount: 500,
          frequency: 'MONTHLY',
          interval: 1,
          isActive: true,
          account: { name: 'Principal' },
          category: { name: 'Vivienda' },
        },
        {
          id: 'r2',
          name: 'Gimnasio',
          amount: 50,
          frequency: 'MONTHLY',
          interval: 1,
          isActive: false,
          account: { name: 'Principal' },
          category: { name: 'Salud' },
        },
      ]),
    };
    const tool = listRecurringExpensesTool({
      recurringRulesService:
        recurringRulesService as unknown as RecurringRulesService,
    });

    const result = await tool.handler({}, ctx);

    expect(result.content[0].text).toContain('Alquiler');
    expect(result.content[0].text).toContain('500.00');
    expect(result.content[0].text).toContain('Gimnasio');
    expect(result.content[0].text).toContain('pausada');
  });
});
