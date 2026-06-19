import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      todayAppointments,
      todayRevenue,
      monthRevenue,
      nextAppointment,
      inactiveCount,
      revenueSeries,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          userId,
          startAt: { gte: today, lt: tomorrow },
          status: { not: 'cancelled' },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          userId,
          paidAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          userId,
          paidAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.appointment.findFirst({
        where: {
          userId,
          startAt: { gte: new Date() },
          status: { in: ['scheduled', 'confirmed'] },
        },
        orderBy: { startAt: 'asc' },
        include: { client: true, services: { include: { service: true } } },
      }),
      this.prisma.client.count({
        where: {
          userId,
          OR: [{ lastVisitAt: null }, { lastVisitAt: { lt: thirtyDaysAgo } }],
        },
      }),
      this.getRevenueSeries(userId, 7),
    ]);

    return {
      todayRevenue: Number(todayRevenue._sum.amount ?? 0),
      todayAppointments,
      monthRevenue: Number(monthRevenue._sum.amount ?? 0),
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            startAt: nextAppointment.startAt,
            client: nextAppointment.client,
            services: nextAppointment.services,
          }
        : null,
      inactiveClientsCount: inactiveCount,
      revenueSeries,
    };
  }

  private async getRevenueSeries(userId: string, days: number) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const payments = await this.prisma.payment.findMany({
      where: { userId, paidAt: { gte: start } },
    });
    const byDay: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    payments.forEach((p) => {
      const day = (p.paidAt as Date).toISOString().slice(0, 10);
      if (byDay[day] !== undefined) byDay[day] += Number(p.amount);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }
}
