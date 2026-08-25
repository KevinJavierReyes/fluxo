import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto, UpdateAssetDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
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

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.asset.delete({ where: { id } });
    return { id, deleted: true };
  }
}
