import { RecurrenceFrequency } from '@prisma/client';
import {
  generateOccurrenceDates,
  RuleScheduleInput,
} from './occurrence-generator';

function toKeys(dates: Date[]): string[] {
  return dates.map((d) => d.toISOString().slice(0, 10));
}

function baseRule(overrides: Partial<RuleScheduleInput>): RuleScheduleInput {
  return {
    frequency: RecurrenceFrequency.DAILY,
    interval: 1,
    byMonthDay: null,
    byWeekday: null,
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: null,
    ...overrides,
  };
}

describe('generateOccurrenceDates', () => {
  describe('MONTHLY', () => {
    it('usa byMonthDay para fijar el día de cada mes', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.MONTHLY,
        byMonthDay: 15,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
    });

    it('ajusta (clamp) al último día del mes cuando byMonthDay no existe en ese mes', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.MONTHLY,
        byMonthDay: 31,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z'),
      );
      // Febrero 2026 (no bisiesto) tiene 28 días; abril tiene 30.
      expect(toKeys(dates)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });

    it('respeta interval > 1 (cada N meses)', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.MONTHLY,
        byMonthDay: 1,
        interval: 3,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-12-31T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual([
        '2026-01-01',
        '2026-04-01',
        '2026-07-01',
        '2026-10-01',
      ]);
    });

    it('sin byMonthDay usa el día del startDate', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2026-01-20T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-03-01T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-01-20', '2026-02-20']);
    });
  });

  describe('WEEKLY', () => {
    it('alinea al byWeekday indicado', () => {
      // startDate es jueves 2026-01-01; byWeekday=1 (lunes)
      const rule = baseRule({
        frequency: RecurrenceFrequency.WEEKLY,
        byWeekday: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-31T00:00:00Z'),
      );
      // Todos los resultados deben caer en lunes
      for (const d of dates) {
        expect(new Date(d).getUTCDay()).toBe(1);
      }
      expect(toKeys(dates)[0]).toBe('2026-01-05');
    });

    it('respeta interval > 1 (cada N semanas)', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.WEEKLY,
        byWeekday: 1,
        interval: 2,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-02-01T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-01-05', '2026-01-19']);
    });
  });

  describe('DAILY y CUSTOM', () => {
    it('DAILY genera una ocurrencia por cada interval días', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.DAILY,
        interval: 3,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-10T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual([
        '2026-01-01',
        '2026-01-04',
        '2026-01-07',
        '2026-01-10',
      ]);
    });

    it('CUSTOM se comporta igual que DAILY con el interval dado', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.CUSTOM,
        interval: 2,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-07T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual([
        '2026-01-01',
        '2026-01-03',
        '2026-01-05',
        '2026-01-07',
      ]);
    });
  });

  describe('YEARLY', () => {
    it('genera una ocurrencia por año en la misma fecha', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.YEARLY,
        startDate: new Date('2026-03-15T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2029-01-01T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-03-15', '2027-03-15', '2028-03-15']);
    });
  });

  describe('límites del rango', () => {
    it('no genera nada si endDate de la regla es anterior al rango pedido', () => {
      const rule = baseRule({
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-05T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-02-01T00:00:00Z'),
        new Date('2026-03-01T00:00:00Z'),
      );
      expect(dates).toEqual([]);
    });

    it('recorta al endDate de la regla aunque el rango pedido sea mayor', () => {
      const rule = baseRule({
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-03T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-10T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });

    it('excluye ocurrencias anteriores a "from" aunque sean posteriores a startDate', () => {
      const rule = baseRule({
        frequency: RecurrenceFrequency.DAILY,
        startDate: new Date('2026-01-01T00:00:00Z'),
      });
      const dates = generateOccurrenceDates(
        rule,
        new Date('2026-01-05T00:00:00Z'),
        new Date('2026-01-07T00:00:00Z'),
      );
      expect(toKeys(dates)).toEqual(['2026-01-05', '2026-01-06', '2026-01-07']);
    });
  });
});
