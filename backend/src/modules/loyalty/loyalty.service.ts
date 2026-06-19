import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async addVisit(clientId: string) {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { clientId },
      create: { clientId, points: 10, visitsCount: 1, lastEarnAt: new Date() },
      update: {
        visitsCount: { increment: 1 },
        points: { increment: 10 },
        lastEarnAt: new Date(),
      },
    });
    return account;
  }

  async getByClient(clientId: string) {
    return this.prisma.loyaltyAccount.findUnique({
      where: { clientId },
    });
  }

  async getRanking(userId: string, limit = 20) {
    const clients = await this.prisma.client.findMany({
      where: { userId },
      include: { loyalty: true },
      orderBy: { visitCount: 'desc' },
      take: limit,
    });
    return clients.map((c, i) => ({
      rank: i + 1,
      clientId: c.id,
      name: c.name,
      visitCount: c.visitCount,
      totalSpent: Number(c.totalSpent),
      points: c.loyalty?.points ?? 0,
    }));
  }

  async getSettings(userId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { userId, key: { startsWith: 'loyalty_' } },
    });
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    return {
      pointsPerVisit: parseInt(map['loyalty_points_per_visit'] ?? '10', 10),
      visitGoal: parseInt(map['loyalty_visit_goal'] ?? '10', 10),
      discountPercent: parseInt(map['loyalty_discount_percent'] ?? '10', 10),
    };
  }

  async updateSettings(userId: string, data: { pointsPerVisit?: number; visitGoal?: number; discountPercent?: number }) {
    if (data.pointsPerVisit != null) {
      await this.prisma.setting.upsert({
        where: { userId_key: { userId, key: 'loyalty_points_per_visit' } },
        create: { userId, key: 'loyalty_points_per_visit', value: String(data.pointsPerVisit) },
        update: { value: String(data.pointsPerVisit) },
      });
    }
    if (data.visitGoal != null) {
      await this.prisma.setting.upsert({
        where: { userId_key: { userId, key: 'loyalty_visit_goal' } },
        create: { userId, key: 'loyalty_visit_goal', value: String(data.visitGoal) },
        update: { value: String(data.visitGoal) },
      });
    }
    if (data.discountPercent != null) {
      await this.prisma.setting.upsert({
        where: { userId_key: { userId, key: 'loyalty_discount_percent' } },
        create: { userId, key: 'loyalty_discount_percent', value: String(data.discountPercent) },
        update: { value: String(data.discountPercent) },
      });
    }
    return this.getSettings(userId);
  }
}
