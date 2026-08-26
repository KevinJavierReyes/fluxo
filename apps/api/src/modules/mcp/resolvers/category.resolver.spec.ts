import { CategoryResolver } from './category.resolver';
import type { PrismaService } from '../../../prisma/prisma.service';

interface MockPrisma {
  category: { findFirst: jest.Mock; findMany: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return { category: { findFirst: jest.fn(), findMany: jest.fn() } };
}

function makeResolver(prisma: MockPrisma): CategoryResolver {
  return new CategoryResolver(prisma as unknown as PrismaService);
}

function lastFindManyWhere(findMany: jest.Mock): Record<string, unknown> {
  const calls = findMany.mock.calls as { where: Record<string, unknown> }[][];
  return calls[calls.length - 1][0].where;
}

describe('CategoryResolver.resolve', () => {
  const userId = 'user-1';

  it('filtra por tipo ANTES de buscar por nombre — nunca resuelve al tipo equivocado', async () => {
    const prisma = makePrismaMock();
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'cat-income',
        name: 'Comida',
        groupId: 'g1',
        group: { id: 'g1', name: 'Reembolsos', type: 'INCOME' },
      },
    ]);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'Comida', 'INCOME');

    expect(lastFindManyWhere(prisma.category.findMany)).toMatchObject({
      group: { type: 'INCOME' },
    });
    expect(result).toMatchObject({ status: 'resolved', id: 'cat-income' });
  });

  it('desambigua dos categorías homónimas en grupos distintos del mismo tipo', async () => {
    const prisma = makePrismaMock();
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Comida',
        groupId: 'g1',
        group: { id: 'g1', name: 'Alimentación', type: 'EXPENSE' },
      },
      {
        id: 'cat-2',
        name: 'Comida',
        groupId: 'g2',
        group: { id: 'g2', name: 'Salidas', type: 'EXPENSE' },
      },
    ]);
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(userId, 'Comida', 'EXPENSE');

    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates).toEqual([
        { id: 'cat-1', label: 'Comida', detail: 'Alimentación' },
        { id: 'cat-2', label: 'Comida', detail: 'Salidas' },
      ]);
    }
  });

  it('rechaza un id que existe pero es del tipo equivocado', async () => {
    const prisma = makePrismaMock();
    prisma.category.findFirst.mockResolvedValue({
      id: 'clx7a9b2c000108l3g8h1k2m3',
      name: 'Supermercado',
      groupId: 'g1',
      group: { id: 'g1', name: 'Alimentación', type: 'EXPENSE' },
    });
    const resolver = makeResolver(prisma);

    const result = await resolver.resolve(
      userId,
      'clx7a9b2c000108l3g8h1k2m3',
      'INCOME',
    );

    expect(result.status).toBe('not_found');
  });

  it('sin type, no filtra por tipo del grupo', async () => {
    const prisma = makePrismaMock();
    prisma.category.findMany.mockResolvedValue([]);
    const resolver = makeResolver(prisma);

    await resolver.resolve(userId, 'Lo que sea');

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, isArchived: false },
      }),
    );
  });
});
