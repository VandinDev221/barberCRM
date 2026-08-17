import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getBarberTzOffsetHours, getLocalTodayRange, getLocalMonthRange } from '../../common/utils/tz.util';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const { today, tomorrow } = getLocalTodayRange();
    const { startOfMonth, endOfMonth } = getLocalMonthRange();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

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
    const tzOffset = getBarberTzOffsetHours();
    const { today } = getLocalTodayRange();
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: { userId, paidAt: { gte: start } },
    });
    const byDay: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      // Construct date string safely in local time
      const shifted = new Date(d.getTime() - tzOffset * 60 * 60 * 1000);
      byDay[shifted.toISOString().slice(0, 10)] = 0;
    }
    payments.forEach((p) => {
      const localPaidAt = new Date(p.paidAt.getTime() - tzOffset * 60 * 60 * 1000);
      const day = localPaidAt.toISOString().slice(0, 10);
      if (byDay[day] !== undefined) byDay[day] += Number(p.amount);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }
}
