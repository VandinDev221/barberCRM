import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        notes: dto.notes,
        photoUrl: dto.photoUrl,
        isVip: dto.isVip ?? false,
      },
    });
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ClientWhereInput = { userId };
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { loyalty: true },
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
      include: {
        loyalty: true,
        appointments: {
          orderBy: { startAt: 'desc' },
          take: 20,
          include: { services: { include: { service: true } } },
        },
        payments: { orderBy: { paidAt: 'desc' }, take: 10 },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(userId, id);
    return this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        notes: dto.notes,
        photoUrl: dto.photoUrl,
        isVip: dto.isVip,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.client.delete({ where: { id } });
    return { message: 'Cliente removido' };
  }
}
