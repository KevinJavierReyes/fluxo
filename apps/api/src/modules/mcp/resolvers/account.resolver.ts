import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ambiguous,
  looksLikeId,
  matchByName,
  notFound,
  resolved,
  type ResolveResult,
} from './resolve-result';

interface AccountLite {
  id: string;
  name: string;
  type: string;
  isArchived: boolean;
}

@Injectable()
export class AccountResolver {
  constructor(private readonly prisma: PrismaService) {}

  /** Resuelve una cuenta por id o por nombre (con desambiguación explícita). */
  async resolve(
    userId: string,
    ref: string,
  ): Promise<ResolveResult<AccountLite>> {
    if (looksLikeId(ref)) {
      const byId = await this.prisma.account.findFirst({
        where: { id: ref, userId },
      });
      // Un id que no pertenece al usuario no distingue "no existe" de "no es
      // tuyo" — no hay que filtrar esa diferencia a quien pregunta.
      if (byId) {
        return resolved(byId.id, byId);
      }
      return notFound();
    }

    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
      take: 200,
    });

    const matches = matchByName(ref, accounts, (a) => a.name);
    if (matches.length === 1) {
      return resolved(matches[0].id, matches[0]);
    }
    const candidates = (matches.length > 0 ? matches : accounts).map((a) => ({
      id: a.id,
      label: a.name,
      detail: a.type,
    }));
    return matches.length > 1 ? ambiguous(candidates) : notFound(candidates);
  }
}
