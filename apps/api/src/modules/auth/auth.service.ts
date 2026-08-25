import { Injectable } from '@nestjs/common';
import { DEFAULT_CATEGORY_GROUPS } from '@fluxo/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(user: CurrentUserPayload) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.user.create({
          data: { id: user.id, email: user.email },
        });

        await tx.categoryGroup.createMany({
          data: DEFAULT_CATEGORY_GROUPS.map((group) => ({
            userId: user.id,
            name: group.name,
            type: group.type,
          })),
        });

        const groups = await tx.categoryGroup.findMany({
          where: { userId: user.id },
        });
        const groupIdByName = new Map(groups.map((g) => [g.name, g.id]));

        await tx.category.createMany({
          data: DEFAULT_CATEGORY_GROUPS.flatMap((group) =>
            group.categories.map((name, index) => ({
              userId: user.id,
              groupId: groupIdByName.get(group.name)!,
              name,
              sortOrder: index,
            })),
          ),
        });

        return created;
      },
      { timeout: 15000 },
    );
  }
}
