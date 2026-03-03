import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        userId,
        name: dto.name,
        price: dto.price,
        duration: dto.duration,
        category: dto.category,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(userId: string, activeOnly = false) {
    const where = activeOnly ? { userId, isActive: true } : { userId };
    return this.prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, userId },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }

  async update(userId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(userId, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        duration: dto.duration,
        category: dto.category,
        isActive: dto.isActive,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.service.delete({ where: { id } });
    return { message: 'Serviço removido' };
  }
}
