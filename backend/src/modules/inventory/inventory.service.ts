import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        userId,
        name: dto.name,
        quantity: dto.quantity ?? 0,
        minQuantity: dto.minQuantity ?? 0,
        unit: dto.unit ?? 'un',
      },
    });
  }

  async findAll(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    const lowStock = items.filter((i) => i.quantity <= i.minQuantity);
    return { items, lowStock };
  }

  async findOne(userId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async update(userId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(userId, id);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        quantity: dto.quantity,
        minQuantity: dto.minQuantity,
        unit: dto.unit,
      },
    });
  }

  async adjustQuantity(userId: string, id: string, delta: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch item with lock
      const items = await tx.$queryRaw<any[]>`SELECT * FROM "inventory" WHERE id = ${id} AND "user_id" = ${userId} FOR UPDATE`;
      if (!items || items.length === 0) {
        throw new NotFoundException('Item não encontrado');
      }
      const item = items[0];

      // 2. Compute new quantity (ensuring it is >= 0)
      const newQty = Math.max(0, item.quantity + delta);

      // 3. Update quantity
      return tx.inventoryItem.update({
        where: { id },
        data: { quantity: newQty },
      });
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.inventoryItem.delete({ where: { id } });
    return { message: 'Item removido' };
  }
}
