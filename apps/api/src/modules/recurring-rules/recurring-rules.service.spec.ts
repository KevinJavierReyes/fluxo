import { TransactionStatus } from '@prisma/client';
import { RecurringRulesService } from './recurring-rules.service';

const rule = {
  id: 'rule-1',
  userId: 'user-1',
  type: 'EXPENSE',
  isActive: true,
  autoConfirm: false,
};

function makeService() {
  const prisma = {
    recurringRule: {
      findFirst: jest.fn().mockResolvedValue(rule),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue(rule),
    },
    transaction: {
      updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    account: { findFirst: jest.fn().mockResolvedValue({ id: 'acc-2' }) },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(prisma)
      : Promise.all(arg as Promise<unknown>[]),
  );
  const categoriesService = {
    assertTypeMatches: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RecurringRulesService(
    prisma as never,
    categoriesService as never,
  );
  return { service, prisma };
}

describe('RecurringRulesService.update', () => {
  it('propaga solo a proyectadas no editadas a mano por defecto', async () => {
    const { service, prisma } = makeService();

    await service.update('user-1', 'rule-1', { amount: 150, name: 'Nuevo' });

    expect(prisma.recurringRule.updateMany).toHaveBeenCalledWith({
      where: { id: 'rule-1', userId: 'user-1' },
      data: { amount: 150, name: 'Nuevo' },
    });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        recurringRuleId: 'rule-1',
        userId: 'user-1',
        isModified: false,
        status: {
          in: [TransactionStatus.PENDING, TransactionStatus.SKIPPED],
        },
      },
      data: { amount: 150 },
    });
  });

  it('incluye CONFIRMED con applyToConfirmed y no lo guarda en la regla', async () => {
    const { service, prisma } = makeService();

    await service.update('user-1', 'rule-1', {
      accountId: 'acc-2',
      description: 'Alquiler',
      applyToConfirmed: true,
    });

    expect(prisma.recurringRule.updateMany).toHaveBeenCalledWith({
      where: { id: 'rule-1', userId: 'user-1' },
      data: { accountId: 'acc-2', description: 'Alquiler' },
    });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        recurringRuleId: 'rule-1',
        userId: 'user-1',
        isModified: false,
        status: {
          in: [
            TransactionStatus.PENDING,
            TransactionStatus.SKIPPED,
            TransactionStatus.CONFIRMED,
          ],
        },
      },
      data: { accountId: 'acc-2', description: 'Alquiler' },
    });
  });

  it('no toca transacciones si no cambia ningún campo que ellas comparten', async () => {
    const { service, prisma } = makeService();

    await service.update('user-1', 'rule-1', {
      name: 'Otro nombre',
      applyToConfirmed: true,
    });

    expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
  });
});

describe('RecurringRulesService.remove', () => {
  it('borra solo las proyectadas por defecto', async () => {
    const { service, prisma } = makeService();

    await service.remove('user-1', 'rule-1');

    expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: {
        recurringRuleId: 'rule-1',
        userId: 'user-1',
        status: {
          in: [TransactionStatus.PENDING, TransactionStatus.SKIPPED],
        },
      },
    });
    expect(prisma.recurringRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
  });

  it('borra también las CONFIRMED con deleteConfirmed', async () => {
    const { service, prisma } = makeService();

    await service.remove('user-1', 'rule-1', { deleteConfirmed: true });

    expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: {
        recurringRuleId: 'rule-1',
        userId: 'user-1',
        status: {
          in: [
            TransactionStatus.PENDING,
            TransactionStatus.SKIPPED,
            TransactionStatus.CONFIRMED,
          ],
        },
      },
    });
  });
});
