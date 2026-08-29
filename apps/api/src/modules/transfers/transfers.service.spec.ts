import { BadRequestException } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import type { PrismaService } from '../../prisma/prisma.service';

function makePrismaMock() {
  return {
    transfer: { findUnique: jest.fn(), create: jest.fn() },
    account: { findFirst: jest.fn() },
  };
}

describe('TransfersService.create', () => {
  const userId = 'user-1';
  const input = {
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    amount: 100,
    date: new Date('2026-08-29'),
  };

  it('rechaza si la cuenta de origen y destino son la misma', async () => {
    const prisma = makePrismaMock();
    const service = new TransfersService(prisma as unknown as PrismaService);

    await expect(
      service.create(userId, { ...input, toAccountId: input.fromAccountId }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.account.findFirst).not.toHaveBeenCalled();
  });

  it('crea la transferencia cuando ambas cuentas existen y pertenecen al usuario', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst
      .mockResolvedValueOnce({ id: 'acc-1' })
      .mockResolvedValueOnce({ id: 'acc-2' });
    prisma.transfer.create.mockResolvedValue({ id: 'transfer-1', ...input });
    const service = new TransfersService(prisma as unknown as PrismaService);

    const result = await service.create(userId, input);

    expect(result.alreadyExisted).toBe(false);
    expect(result.transfer.id).toBe('transfer-1');
  });

  it('rechaza si la cuenta de origen no existe/no es del usuario', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'acc-2' });
    const service = new TransfersService(prisma as unknown as PrismaService);

    await expect(service.create(userId, input)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('con clientRequestId repetido, devuelve la existente sin crear una nueva', async () => {
    const prisma = makePrismaMock();
    const existing = { id: 'transfer-1', ...input };
    prisma.transfer.findUnique.mockResolvedValue(existing);
    const service = new TransfersService(prisma as unknown as PrismaService);

    const result = await service.create(userId, {
      ...input,
      clientRequestId: 'req-1',
    });

    expect(result).toEqual({ transfer: existing, alreadyExisted: true });
    expect(prisma.transfer.create).not.toHaveBeenCalled();
    expect(prisma.account.findFirst).not.toHaveBeenCalled();
  });
});
