import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface MockPrisma {
  category: { findFirst: jest.Mock; findMany: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function makeService(prisma: MockPrisma): CategoriesService {
  return new CategoriesService(prisma as unknown as PrismaService);
}

/** Extrae el `where` del último llamado a `findMany` sin anidar matchers. */
function lastFindManyWhere(findMany: jest.Mock): Record<string, unknown> {
  const calls = findMany.mock.calls as { where: Record<string, unknown> }[][];
  return calls[calls.length - 1][0].where;
}

describe('CategoriesService.assertTypeMatches', () => {
  const userId = 'user-1';

  it('pasa cuando el tipo de transacción coincide con el tipo del grupo', async () => {
    const prisma = makePrismaMock();
    prisma.category.findFirst.mockResolvedValue({
      id: 'cat-1',
      name: 'Mercado',
      group: { type: 'EXPENSE' },
    });
    const service = makeService(prisma);

    const result = await service.assertTypeMatches(userId, 'cat-1', 'EXPENSE');

    expect(result.name).toBe('Mercado');
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('rechaza cuando el tipo no coincide y lista categorías válidas del tipo correcto', async () => {
    const prisma = makePrismaMock();
    prisma.category.findFirst.mockResolvedValue({
      id: 'cat-1',
      name: 'Supermercado',
      group: { type: 'EXPENSE' },
    });
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-2', name: 'Salario', group: { name: 'Ingresos fijos' } },
      { id: 'cat-3', name: 'Freelance', group: { name: 'Ingresos variables' } },
    ]);
    const service = makeService(prisma);

    await expect(
      service.assertTypeMatches(userId, 'cat-1', 'INCOME'),
    ).rejects.toThrow(BadRequestException);

    // Verifica que el error trae las candidatas correctas, no solo un mensaje genérico.
    try {
      await service.assertTypeMatches(userId, 'cat-1', 'INCOME');
      fail('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        error: string;
        validCategories: { id: string; name: string }[];
      };
      expect(response.error).toBe('category_type_mismatch');
      expect(response.validCategories).toHaveLength(2);
      expect(response.validCategories[0]).toMatchObject({
        id: 'cat-2',
        name: 'Salario',
      });
    }

    // La búsqueda de candidatas debe filtrar por el tipo pedido (INCOME),
    // no por el tipo actual de la categoría (EXPENSE) — si se invirtiera,
    // sugeriría categorías igual de inválidas.
    expect(lastFindManyWhere(prisma.category.findMany)).toMatchObject({
      group: { type: 'INCOME' },
    });
  });

  it('rechaza con 400 cuando la categoría no existe o no es del usuario', async () => {
    const prisma = makePrismaMock();
    prisma.category.findFirst.mockResolvedValue(null);
    const service = makeService(prisma);

    await expect(
      service.assertTypeMatches(userId, 'cat-ajena', 'EXPENSE'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });
});
