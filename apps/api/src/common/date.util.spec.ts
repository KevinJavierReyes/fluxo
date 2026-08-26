import {
  addDays,
  bucketStart,
  daysInMonth,
  eachBucket,
  isValidTimezone,
  nextBucket,
  startOfMonthForUser,
  startOfMonthUtc,
  startOfWeekUtc,
  todayForUser,
  todayUtc,
  toDateKey,
} from './date.util';

describe('date.util', () => {
  describe('todayUtc', () => {
    it('devuelve medianoche UTC del día actual', () => {
      const today = todayUtc();
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
      expect(today.getUTCSeconds()).toBe(0);
    });
  });

  describe('todayForUser', () => {
    it('puede diferir de todayUtc cerca de la medianoche UTC', () => {
      // 23:30 UTC del 15 de marzo -> en UTC-5 (Lima) todavía es el mismo día
      // 15, pero en UTC+9 (Tokio) ya es 16. Se fija la hora del sistema para
      // hacer la prueba determinística.
      jest.useFakeTimers().setSystemTime(new Date('2026-03-15T23:30:00Z'));

      const limaToday = todayForUser('America/Lima');
      const tokyoToday = todayForUser('Asia/Tokyo');

      expect(toDateKey(limaToday)).toBe('2026-03-15');
      expect(toDateKey(tokyoToday)).toBe('2026-03-16');

      jest.useRealTimers();
    });

    it('representa el resultado como medianoche UTC del día civil', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'));
      const result = todayForUser('America/Lima');
      expect(result.getUTCHours()).toBe(0);
      jest.useRealTimers();
    });
  });

  describe('startOfMonthForUser', () => {
    it('devuelve el día 1 del mes según la zona del usuario', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-15T10:00:00Z'));
      const result = startOfMonthForUser('America/Lima');
      expect(toDateKey(result)).toBe('2026-03-01');
      jest.useRealTimers();
    });
  });

  describe('isValidTimezone', () => {
    it('acepta zonas IANA válidas', () => {
      expect(isValidTimezone('America/Lima')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('rechaza strings inválidos', () => {
      expect(isValidTimezone('No/Existe')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('addDays', () => {
    it('suma días cruzando el fin de mes', () => {
      const result = addDays(new Date('2026-01-30T00:00:00Z'), 3);
      expect(toDateKey(result)).toBe('2026-02-02');
    });

    it('resta días con valores negativos', () => {
      const result = addDays(new Date('2026-03-01T00:00:00Z'), -1);
      expect(toDateKey(result)).toBe('2026-02-28');
    });
  });

  describe('daysInMonth', () => {
    it('calcula correctamente febrero en año bisiesto', () => {
      expect(daysInMonth(2024, 1)).toBe(29); // mes 1 = febrero (0-indexed)
    });

    it('calcula correctamente febrero en año no bisiesto', () => {
      expect(daysInMonth(2026, 1)).toBe(28);
    });

    it('calcula meses de 30 y 31 días', () => {
      expect(daysInMonth(2026, 3)).toBe(30); // abril
      expect(daysInMonth(2026, 0)).toBe(31); // enero
    });
  });

  describe('startOfWeekUtc', () => {
    it('retrocede al lunes cuando la fecha es domingo', () => {
      // 2026-01-04 es domingo
      const result = startOfWeekUtc(new Date('2026-01-04T00:00:00Z'));
      expect(toDateKey(result)).toBe('2025-12-29'); // lunes anterior
    });

    it('retrocede al lunes de la misma semana en un día laborable', () => {
      // 2026-01-07 es miércoles
      const result = startOfWeekUtc(new Date('2026-01-07T00:00:00Z'));
      expect(toDateKey(result)).toBe('2026-01-05'); // lunes de esa semana
    });

    it('devuelve la misma fecha si ya es lunes', () => {
      const result = startOfWeekUtc(new Date('2026-01-05T00:00:00Z'));
      expect(toDateKey(result)).toBe('2026-01-05');
    });
  });

  describe('startOfMonthUtc', () => {
    it('devuelve el día 1 del mes', () => {
      const result = startOfMonthUtc(new Date('2026-07-23T00:00:00Z'));
      expect(toDateKey(result)).toBe('2026-07-01');
    });
  });

  describe('bucketStart', () => {
    it('day: trunca a medianoche UTC', () => {
      const result = bucketStart(new Date('2026-05-10T15:30:00Z'), 'day');
      expect(toDateKey(result)).toBe('2026-05-10');
    });

    it('week: usa startOfWeekUtc', () => {
      const result = bucketStart(new Date('2026-01-07T00:00:00Z'), 'week');
      expect(toDateKey(result)).toBe('2026-01-05');
    });

    it('month: usa startOfMonthUtc', () => {
      const result = bucketStart(new Date('2026-01-07T00:00:00Z'), 'month');
      expect(toDateKey(result)).toBe('2026-01-01');
    });
  });

  describe('nextBucket', () => {
    it('day: avanza un día', () => {
      const result = nextBucket(new Date('2026-01-31T00:00:00Z'), 'day');
      expect(toDateKey(result)).toBe('2026-02-01');
    });

    it('week: avanza 7 días', () => {
      const result = nextBucket(new Date('2026-01-05T00:00:00Z'), 'week');
      expect(toDateKey(result)).toBe('2026-01-12');
    });

    it('month: avanza al día 1 del mes siguiente, incluso cruzando diciembre', () => {
      const result = nextBucket(new Date('2026-12-01T00:00:00Z'), 'month');
      expect(toDateKey(result)).toBe('2027-01-01');
    });
  });

  describe('eachBucket', () => {
    it('genera un bucket por día en el rango, inclusive', () => {
      const result = eachBucket(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-05T00:00:00Z'),
        'day',
      );
      expect(result.map(toDateKey)).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
        '2026-01-05',
      ]);
    });

    it('respeta la guarda de iteraciones máximas en rangos absurdamente largos', () => {
      const result = eachBucket(
        new Date('2000-01-01T00:00:00Z'),
        new Date('2100-01-01T00:00:00Z'),
        'day',
      );
      expect(result.length).toBeLessThanOrEqual(4000);
    });

    it('devuelve un único bucket cuando from === to', () => {
      const result = eachBucket(
        new Date('2026-03-01T00:00:00Z'),
        new Date('2026-03-01T00:00:00Z'),
        'day',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('toDateKey', () => {
    it('formatea como YYYY-MM-DD', () => {
      expect(toDateKey(new Date('2026-09-05T00:00:00Z'))).toBe('2026-09-05');
    });
  });
});
