import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('rechaza si la cuenta de origen está archivada', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst
      .mockResolvedValueOnce({ id: 'acc-1', isArchived: true })
      .mockResolvedValueOnce({ id: 'acc-2', isArchived: false });
    const service = new TransfersService(prisma as unknown as PrismaService);

    await expect(service.create(userId, input)).rejects.toThrow(
      'La cuenta de origen está archivada',
    );
    expect(prisma.transfer.create).not.toHaveBeenCalled();
  });

  it('rechaza si la cuenta de destino está archivada', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst
      .mockResolvedValueOnce({ id: 'acc-1', isArchived: false })
      .mockResolvedValueOnce({ id: 'acc-2', isArchived: true });
    const service = new TransfersService(prisma as unknown as PrismaService);

    await expect(service.create(userId, input)).rejects.toThrow(
      'La cuenta de destino está archivada',
    );
    expect(prisma.transfer.create).not.toHaveBeenCalled();
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

describe('TransfersService.findAll', () => {
  function makeListMock() {
    return { transfer: { findMany: jest.fn().mockResolvedValue([]) } };
  }

  it('sin filtros, lista solo las del usuario ordenadas por fecha desc', async () => {
    const prisma = makeListMock();
    const service = new TransfersService(prisma as unknown as PrismaService);

    await service.findAll('user-1', {});

    expect(prisma.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('filtra por cuenta (origen o destino) y por rango de fechas', async () => {
    const prisma = makeListMock();
    const service = new TransfersService(prisma as unknown as PrismaService);
    const from = new Date('2026-08-01');
    const to = new Date('2026-08-31');

    await service.findAll('user-1', { accountId: 'acc-1', from, to });

    expect(prisma.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          OR: [{ fromAccountId: 'acc-1' }, { toAccountId: 'acc-1' }],
          date: { gte: from, lte: to },
        },
      }),
    );
  });
});

describe('TransfersService.findOne / remove', () => {
  it('findOne lanza NotFound si la transferencia no es del usuario', async () => {
    const prisma = {
      transfer: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new TransfersService(prisma as unknown as PrismaService);

    await expect(service.findOne('user-1', 't-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.transfer.findFirst).toHaveBeenCalledWith({
      where: { id: 't-1', userId: 'user-1' },
    });
  });

  it('remove borra la transferencia tras verificar que es del usuario', async () => {
    const prisma = {
      transfer: {
        findFirst: jest.fn().mockResolvedValue({ id: 't-1' }),
        delete: jest.fn().mockResolvedValue({ id: 't-1' }),
      },
    };
    const service = new TransfersService(prisma as unknown as PrismaService);

    await service.remove('user-1', 't-1');

    expect(prisma.transfer.delete).toHaveBeenCalledWith({
      where: { id: 't-1' },
    });
  });
});
