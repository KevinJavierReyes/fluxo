import { Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';
import {
  bucketStart,
  eachBucket,
  todayForUser,
  type Granularity,
} from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';

export interface CashflowDayPoint {
  date: Date;
  /** Ingreso proyectado (CONFIRMED + PENDING) del día. */
  income: number;
  /** Gasto proyectado (CONFIRMED + PENDING) del día. */
  expense: number;
  /** Saldo proyectado al inicio del día. */
  openingBalance: number;
  /** Saldo proyectado al cierre del día. */
  closingBalance: number;
  /** Saldo real (solo CONFIRMED) al inicio del día; null si el día es futuro. */
  realOpeningBalance: number | null;
  /** Saldo real (solo CONFIRMED) al cierre del día; null si el día es futuro. */
  realClosingBalance: number | null;
  /** Hay PENDING contadas en este día. */
  hasPending: boolean;
  isNegative: boolean;
}

export interface CashflowProjection {
  /** Saldo proyectado al inicio del rango. */
  startingBalance: number;
  /** Saldo real al inicio del rango. */
  realStartingBalance: number;
  points: CashflowDayPoint[];
  negativeDays: Date[];
}

export interface CashflowBalanceBucket {
  bucket: Date;
  /** Saldo proyectado al inicio del bucket. */
  openingBalance: number;
  /** Saldo proyectado al cierre del bucket. */
  closingBalance: number;
  /** Saldo real al inicio del bucket; null si el bucket es futuro. */
  realOpeningBalance: number | null;
  /** Saldo real al cierre del bucket; null si el bucket es futuro. */
  realClosingBalance: number | null;
  hasPending: boolean;
  income: number;
  expense: number;
  isNegative: boolean;
  isFuture: boolean;
}

interface DailyDelta {
  income: number;
  expense: number;
  realIncome: number;
  realExpense: number;
  hasPending: boolean;
}

function emptyDelta(): DailyDelta {
  return {
    income: 0,
    expense: 0,
    realIncome: 0,
    realExpense: 0,
    hasPending: false,
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

@Injectable()
export class CashflowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza el filtro de cuenta(s) a una lista, o `undefined` si debe
   * aplicarse a todas las cuentas no archivadas del usuario.
   */
  private resolveAccountIds(
    accountId?: string | string[],
  ): string[] | undefined {
    if (typeof accountId === 'string') return [accountId];
    if (Array.isArray(accountId) && accountId.length > 0) return accountId;
    return undefined;
  }

  /**
   * Las transferencias no son ingreso ni gasto real (se cancelan a nivel
   * patrimonio), así que nunca se mezclan con `income`/`expense` — esos
   * campos siguen siendo "ingreso/gasto real" en todos lados que los
   * exponen. Solo afectan el saldo (`closingBalance`/`openingBalance`), acá
   * y en `getProjection`/`getBalanceSeries` de abajo. Mismo criterio que
   * transacciones: sin `accountId`, se excluye la pata que caiga en una
   * cuenta archivada.
   */
  private async getTransferNetDeltasByDate(
    userId: string,
    from: Date,
    to: Date,
    accountId?: string | string[],
  ): Promise<Map<string, number>> {
    const ids = this.resolveAccountIds(accountId);
    const [transfersIn, transfersOut] = await Promise.all([
      this.prisma.transfer.groupBy({
        by: ['date'],
        where: {
          userId,
          ...(ids
            ? { toAccountId: { in: ids } }
            : { toAccount: { isArchived: false } }),
          date: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      this.prisma.transfer.groupBy({
        by: ['date'],
        where: {
          userId,
          ...(ids
            ? { fromAccountId: { in: ids } }
            : { fromAccount: { isArchived: false } }),
          date: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ]);

    const deltas = new Map<string, number>();
    for (const row of transfersIn) {
      const key = toDateKey(row.date);
      deltas.set(key, (deltas.get(key) ?? 0) + Number(row._sum.amount ?? 0));
    }
    for (const row of transfersOut) {
      const key = toDateKey(row.date);
      deltas.set(key, (deltas.get(key) ?? 0) - Number(row._sum.amount ?? 0));
    }
    return deltas;
  }

  /**
   * Deltas diarios de ingreso/gasto en `[from, to]`, separando el efecto real
   * del proyectado:
   * - CONFIRMED cuenta en el proyectado el día de su fecha, y en el real solo
   *   si esa fecha ya llegó (`<= today`).
   * - PENDING cuenta solo en el proyectado; si ya venció (`date < today`) se
   *   cuenta en `today` (la hipótesis es que se pagará hoy).
   * - SKIPPED no cuenta en ningún lado.
   * Las claves del mapa son la fecha efectiva (YYYY-MM-DD).
   */
  private async getDailyDeltas(
    userId: string,
    from: Date,
    to: Date,
    accountId: string | string[] | undefined,
    today: Date,
  ): Promise<Map<string, DailyDelta>> {
    const ids = this.resolveAccountIds(accountId);
    const rows = await this.prisma.transaction.groupBy({
      by: ['date', 'type', 'status'],
      where: {
        userId,
        // Mismo criterio que getBalanceAt: si no se filtra por cuenta, excluir
        // las archivadas — si no, el saldo inicial (que sí las excluye) y los
        // deltas quedaban calculados con criterios distintos.
        ...(ids
          ? { accountId: { in: ids } }
          : { account: { isArchived: false } }),
        // Las PENDING vencidas pueden tener fecha anterior a `from` pero caer
        // dentro del rango como "hoy": por eso su cota inferior se resuelve
        // abajo, en memoria, y acá solo se acota por `to`.
        OR: [
          {
            status: TransactionStatus.CONFIRMED,
            date: { gte: from, lte: to },
          },
          { status: TransactionStatus.PENDING, date: { lte: to } },
        ],
      },
      _sum: { amount: true },
    });

    const fromKey = toDateKey(from);
    const toKey = toDateKey(to);
    const todayKey = toDateKey(today);
    const byKey = new Map<string, DailyDelta>();

    for (const row of rows) {
      if (row.status === TransactionStatus.SKIPPED) continue;
      const dateKey = toDateKey(row.date);
      const amount = Number(row._sum.amount ?? 0);
      const isIncome = row.type === TransactionType.INCOME;
      const isPending = row.status === TransactionStatus.PENDING;

      const key = isPending && dateKey < todayKey ? todayKey : dateKey;
      if (key < fromKey || key > toKey) continue;

      const entry = byKey.get(key) ?? emptyDelta();
      if (isIncome) entry.income += amount;
      else entry.expense += amount;
      if (isPending) {
        entry.hasPending = true;
      } else if (dateKey <= todayKey) {
        if (isIncome) entry.realIncome += amount;
        else entry.realExpense += amount;
      }
      byKey.set(key, entry);
    }
    return byKey;
  }

  /** Saldo real de arranque de un rango que empieza en `from` (nunca futuro). */
  private getRealStartingBalance(
    userId: string,
    from: Date,
    today: Date,
    accountId?: string | string[],
  ): Promise<number> {
    return from.getTime() <= today.getTime()
      ? this.getBalanceAt(userId, from, accountId, true)
      : this.getBalanceAt(userId, today, accountId, false);
  }

  async getProjection(
    userId: string,
    {
      from,
      to,
      accountId,
    }: { from: Date; to: Date; accountId?: string | string[] },
    timezone: string,
  ): Promise<CashflowProjection> {
    const today = todayForUser(timezone);
    const todayKey = toDateKey(today);

    const [startingBalance, realStartingBalance, dailyDeltas, transferDeltas] =
      await Promise.all([
        this.getBalanceAt(userId, from, accountId, true, today),
        this.getRealStartingBalance(userId, from, today, accountId),
        this.getDailyDeltas(userId, from, to, accountId, today),
        this.getTransferNetDeltasByDate(userId, from, to, accountId),
      ]);

    const sortedKeys = Array.from(
      new Set([...dailyDeltas.keys(), ...transferDeltas.keys()]),
    ).sort();
    let running = startingBalance;
    let realRunning = realStartingBalance;
    const points: CashflowDayPoint[] = [];
    const negativeDays: Date[] = [];

    for (const key of sortedKeys) {
      const delta = dailyDeltas.get(key) ?? emptyDelta();
      const transferNet = transferDeltas.get(key) ?? 0;
      const openingBalance = running;
      const closingBalance =
        openingBalance + delta.income - delta.expense + transferNet;
      running = closingBalance;

      let realOpeningBalance: number | null = null;
      let realClosingBalance: number | null = null;
      if (key <= todayKey) {
        realOpeningBalance = realRunning;
        realClosingBalance =
          realRunning + delta.realIncome - delta.realExpense + transferNet;
        realRunning = realClosingBalance;
      }

      const isNegative = closingBalance < 0;
      if (isNegative) {
        negativeDays.push(fromDateKey(key));
      }
      points.push({
        date: fromDateKey(key),
        income: delta.income,
        expense: delta.expense,
        openingBalance,
        closingBalance,
        realOpeningBalance,
        realClosingBalance,
        hasPending: delta.hasPending,
        isNegative,
      });
    }

    return { startingBalance, realStartingBalance, points, negativeDays };
  }

  /**
   * Serie de saldo agrupada por día / semana / mes.
   *
   * A diferencia de `getProjection`, emite un punto por cada bucket del rango
   * aunque no haya movimientos: la curva del dashboard necesita ser continua.
   * Sólo acepta el filtro de cuenta a propósito — el saldo debe seguir siendo
   * el saldo real aunque el usuario filtre por categoría o por monto.
   */
  async getBalanceSeries(
    userId: string,
    {
      from,
      to,
      granularity,
      accountId,
    }: { from: Date; to: Date; granularity: Granularity; accountId?: string },
    timezone: string,
  ): Promise<CashflowBalanceBucket[]> {
    const buckets = eachBucket(from, to, granularity);
    if (buckets.length === 0) {
      return [];
    }

    const seriesStart = buckets[0];
    const today = todayForUser(timezone);
    const todayKey = toDateKey(today);
    const todayBucket = bucketStart(today, granularity).getTime();

    const [openingBalance, realOpeningBalance, dailyDeltas, transferDeltas] =
      await Promise.all([
        this.getBalanceAt(userId, seriesStart, accountId, true, today),
        this.getRealStartingBalance(userId, seriesStart, today, accountId),
        this.getDailyDeltas(userId, seriesStart, to, accountId, today),
        this.getTransferNetDeltasByDate(userId, seriesStart, to, accountId),
      ]);

    const byBucket = new Map<string, DailyDelta>();
    for (const [dateKey, delta] of dailyDeltas) {
      const key = toDateKey(bucketStart(fromDateKey(dateKey), granularity));
      const entry = byBucket.get(key) ?? emptyDelta();
      entry.income += delta.income;
      entry.expense += delta.expense;
      entry.realIncome += delta.realIncome;
      entry.realExpense += delta.realExpense;
      entry.hasPending = entry.hasPending || delta.hasPending;
      byBucket.set(key, entry);
    }

    const transferByBucket = new Map<string, number>();
    const realTransferByBucket = new Map<string, number>();
    for (const [dateKey, delta] of transferDeltas) {
      const key = toDateKey(bucketStart(fromDateKey(dateKey), granularity));
      transferByBucket.set(key, (transferByBucket.get(key) ?? 0) + delta);
      if (dateKey <= todayKey) {
        realTransferByBucket.set(
          key,
          (realTransferByBucket.get(key) ?? 0) + delta,
        );
      }
    }

    let running = openingBalance;
    let realRunning = realOpeningBalance;
    return buckets.map((bucket) => {
      const key = toDateKey(bucket);
      const delta = byBucket.get(key) ?? emptyDelta();
      const bucketOpening = running;
      const closingBalance =
        bucketOpening +
        delta.income -
        delta.expense +
        (transferByBucket.get(key) ?? 0);
      running = closingBalance;

      const isFuture = bucket.getTime() > todayBucket;
      let bucketRealOpening: number | null = null;
      let bucketRealClosing: number | null = null;
      if (!isFuture) {
        bucketRealOpening = realRunning;
        bucketRealClosing =
          realRunning +
          delta.realIncome -
          delta.realExpense +
          (realTransferByBucket.get(key) ?? 0);
        realRunning = bucketRealClosing;
      }

      return {
        bucket,
        openingBalance: bucketOpening,
        closingBalance,
        realOpeningBalance: bucketRealOpening,
        realClosingBalance: bucketRealClosing,
        hasPending: delta.hasPending,
        income: delta.income,
        expense: delta.expense,
        isNegative: closingBalance < 0,
        isFuture,
      };
    });
  }

  /**
   * Saldo acumulado de una cuenta (o de todas) hasta una fecha.
   * `exclusive` = true excluye la fecha exacta (para calcular el saldo de apertura de un rango).
   *
   * Por defecto es el saldo **real**: solo transacciones CONFIRMED. Si se pasa
   * `projectedToday` (la fecha "hoy" del usuario) devuelve el saldo
   * **proyectado**: suma además las PENDING, pero solo cuando `at` es posterior
   * a hoy — una PENDING vencida se considera pagada hoy, no en su fecha vieja.
   */
  async getBalanceAt(
    userId: string,
    at: Date,
    accountId?: string | string[],
    exclusive = false,
    projectedToday?: Date,
  ): Promise<number> {
    // Las cuentas archivadas son borrados suaves: no cuentan para el saldo, ni
    // con su saldo inicial ni con sus movimientos. Así el total, las tarjetas de
    // wallets y la curva de saldo hablan siempre del mismo conjunto de cuentas.
    const ids = this.resolveAccountIds(accountId);
    const accountFilter = ids ? { id: { in: ids } } : { isArchived: false };

    const accounts = await this.prisma.account.findMany({
      where: { userId, ...accountFilter },
    });
    const openingBalanceSum = accounts.reduce(
      (sum, a) => sum + Number(a.openingBalance),
      0,
    );

    const dateFilter = exclusive ? { lt: at } : { lte: at };

    const includePending =
      projectedToday !== undefined &&
      (exclusive
        ? projectedToday.getTime() < at.getTime()
        : projectedToday.getTime() <= at.getTime());
    const statusFilter = includePending
      ? { in: [TransactionStatus.CONFIRMED, TransactionStatus.PENDING] }
      : TransactionStatus.CONFIRMED;

    const [agg, transfersIn, transfersOut] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          ...(ids
            ? { accountId: { in: ids } }
            : { account: { isArchived: false } }),
          status: statusFilter,
          date: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.transfer.aggregate({
        where: {
          userId,
          ...(ids
            ? { toAccountId: { in: ids } }
            : { toAccount: { isArchived: false } }),
          date: dateFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.transfer.aggregate({
        where: {
          userId,
          ...(ids
            ? { fromAccountId: { in: ids } }
            : { fromAccount: { isArchived: false } }),
          date: dateFilter,
        },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(
      agg.find((a) => a.type === TransactionType.INCOME)?._sum.amount ?? 0,
    );
    const expense = Number(
      agg.find((a) => a.type === TransactionType.EXPENSE)?._sum.amount ?? 0,
    );
    const transferNet =
      Number(transfersIn._sum.amount ?? 0) -
      Number(transfersOut._sum.amount ?? 0);

    return openingBalanceSum + income - expense + transferNet;
  }
}
