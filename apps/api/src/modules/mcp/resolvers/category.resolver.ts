import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ambiguous,
  looksLikeId,
  matchByName,
  notFound,
  resolved,
  type ResolveResult,
} from './resolve-result';

interface CategoryLite {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  groupType: TransactionType;
}

@Injectable()
export class CategoryResolver {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve una categoría por id o por nombre. Si se indica `type`, filtra
   * las candidatas por el tipo del grupo ANTES de buscar por nombre — así
   * "sueldo" nunca puede resolver a una categoría de gasto homónima, y la
   * lista de candidatas en un error de ambigüedad ya viene acotada al tipo
   * correcto.
   */
  async resolve(
    userId: string,
    ref: string,
    type?: TransactionType,
  ): Promise<ResolveResult<CategoryLite>> {
    if (looksLikeId(ref)) {
      const byId = await this.prisma.category.findFirst({
        where: { id: ref, userId },
        include: { group: { select: { id: true, name: true, type: true } } },
      });
      if (!byId) {
        return notFound();
      }
      if (type && byId.group.type !== type) {
        return notFound([
          {
            id: byId.id,
            label: byId.name,
            detail: `es de ${byId.group.type}, no de ${type}`,
          },
        ]);
      }
      return resolved(byId.id, toLite(byId));
    }

    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        isArchived: false,
        ...(type ? { group: { type } } : {}),
      },
      include: { group: { select: { id: true, name: true, type: true } } },
      orderBy: { name: 'asc' },
      take: 500,
    });

    const matches = matchByName(ref, categories, (c) => c.name);
    if (matches.length === 1) {
      return resolved(matches[0].id, toLite(matches[0]));
    }
    const candidates = (matches.length > 0 ? matches : categories).map((c) => ({
      id: c.id,
      label: c.name,
      detail: c.group.name,
    }));
    return matches.length > 1 ? ambiguous(candidates) : notFound(candidates);
  }
}

function toLite(category: {
  id: string;
  name: string;
  groupId: string;
  group: { id: string; name: string; type: TransactionType };
}): CategoryLite {
  return {
    id: category.id,
    name: category.name,
    groupId: category.groupId,
    groupName: category.group.name,
    groupType: category.group.type,
  };
}
