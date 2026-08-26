import { AccountResolver } from './account.resolver';
import type { PrismaService } from '../../../prisma/prisma.service';

interface MockPrisma {
  account: { findFirst: jest.Mock; findMany: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return { account: { findFirst: jest.fn(), findMany: jest.fn() } };
}

function makeResolver(prisma: MockPrisma): AccountResolver {
  return new AccountResolver(prisma as unknown as PrismaService);
}

describe('AccountResolver.resolve', () => {
  const userId = 'user-1';

  it('resuelve directo por id cuando el ref parece un cuid', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst.mockResolvedValue({
      id: 'clx7a9b2c000108l3g8h1k2m3',
      name: 'Ahorros',
      type: 'BANK',
      isArchived: false,
    });
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'clx7a9b2c000108l3g8h1k2m3');

    expect(result.status).toBe('resolved');
    expect(prisma.account.findMany).not.toHaveBeenCalled();
  });

  it('devuelve not_found (no un id ajeno filtrado) cuando el id no es del usuario', async () => {
    const prisma = makePrismaMock();
    prisma.account.findFirst.mockResolvedValue(null);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'clx7a9b2c000108l3g8h1k2m3');

    expect(result.status).toBe('not_found');
  });

  it('resuelve por nombre exacto (insensible a mayúsculas y acentos)', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Cuenta Corriente',
        type: 'BANK',
        isArchived: false,
      },
      { id: 'acc-2', name: 'Ahorros', type: 'BANK', isArchived: false },
    ]);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'CUENTA corriente');

    expect(result).toMatchObject({ status: 'resolved', id: 'acc-1' });
  });

  it('devuelve ambiguous con candidatas cuando el nombre matchea más de una cuenta', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'BCP Soles', type: 'BANK', isArchived: false },
      { id: 'acc-2', name: 'BCP Dólares', type: 'BANK', isArchived: false },
    ]);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'BCP');

    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.id)).toEqual(['acc-1', 'acc-2']);
    }
  });

  it('devuelve not_found con la lista completa de cuentas cuando no matchea ninguna', async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Ahorros', type: 'BANK', isArchived: false },
    ]);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'Efectivo');

    expect(result.status).toBe('not_found');
    if (result.status === 'not_found') {
      expect(result.candidates).toHaveLength(1);
    }
  });
});
