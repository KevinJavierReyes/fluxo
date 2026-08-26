import { Injectable, NotFoundException } from '@nestjs/common';
import { archivedResult } from '../../common/delete-result';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto, UpdateAssetDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, userId } });
    if (!asset) {
      throw new NotFoundException('Activo no encontrado');
    }
    return asset;
  }

  create(userId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAssetDto) {
    const data: UpdateAssetDto & { soldAt?: Date | null } = { ...dto };
    if (dto.isSold === true) {
      data.soldAt = new Date();
    } else if (dto.isSold === false) {
      data.soldAt = null;
    }

    const result = await this.prisma.asset.updateMany({
      where: { id, userId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Activo no encontrado');
    }
    return this.findOne(userId, id);
  }

  /**
   * Los activos no tienen ninguna entidad que los referencie, pero son
   * historial financiero del usuario: se archivan en vez de borrarse físico
   * para no perder ese historial y para que un futuro "deshacer" (MCP) sea
   * posible.
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const asset = await this.prisma.asset.update({
      where: { id },
      data: { isArchived: true },
    });
    return archivedResult(id, asset);
  }
}
