import { Injectable } from '@nestjs/common';
import { todayForUser } from '../../common/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CashflowService } from '../cashflow/cashflow.service';

@Injectable()
export class NetWorthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashflowService: CashflowService,
  ) {}

  async getNetWorth(userId: string, timezone: string) {
    const today = todayForUser(timezone);

    const [accountsBalance, assets, obligations] = await Promise.all([
      this.cashflowService.getBalanceAt(userId, today),
      this.prisma.asset.findMany({
        where: { userId, isArchived: false, isSold: false },
        select: { id: true, name: true, estimatedValue: true },
      }),
      this.prisma.obligation.findMany({
        where: { userId, isArchived: false, isPaidOff: false },
        select: {
          id: true,
          creditorName: true,
          totalAmount: true,
          monthlyPayment: true,
          remainingMonths: true,
        },
      }),
    ]);

    const assetsValue = assets.reduce(
      (sum, a) => sum + Number(a.estimatedValue),
      0,
    );

    // Cuando se conoce remainingMonths, la deuda pendiente es la suma de
    // los pagos que faltan; si no, se asume el total original como estimado
    // conservador (no hay un campo que registre cuánto ya se pagó).
    const obligationsBreakdown = obligations.map((o) => ({
      id: o.id,
      creditorName: o.creditorName,
      remainingBalance:
        o.remainingMonths != null
          ? Number(o.monthlyPayment) * o.remainingMonths
          : Number(o.totalAmount),
    }));
    const obligationsValue = obligationsBreakdown.reduce(
      (sum, o) => sum + o.remainingBalance,
      0,
    );

    return {
      netWorth: accountsBalance + assetsValue - obligationsValue,
      accountsBalance,
      assetsValue,
      obligationsValue,
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        estimatedValue: Number(a.estimatedValue),
      })),
      obligations: obligationsBreakdown,
    };
  }
}
