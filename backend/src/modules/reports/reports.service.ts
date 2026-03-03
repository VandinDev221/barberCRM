import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async revenueByPeriod(userId: string, startDate: string, endDate: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        paidAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      orderBy: { paidAt: 'asc' },
    });
    const byDay: Record<string, number> = {};
    payments.forEach((p) => {
      const day = (p.paidAt as Date).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(p.amount);
    });
    return {
      series: Object.entries(byDay).map(([date, value]) => ({ date, value })),
      total: payments.reduce((s, p) => s + Number(p.amount), 0),
    };
  }

  async topServices(userId: string, startDate: string, endDate: string) {
    const completed = await this.prisma.appointment.findMany({
      where: {
        userId,
        status: 'completed',
        startAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { services: { include: { service: true } } },
    });
    const count: Record<string, { name: string; count: number; revenue: number }> = {};
    completed.forEach((apt) => {
      apt.services.forEach((s) => {
        const id = s.serviceId;
        if (!count[id]) {
          count[id] = { name: (s.service as any).name, count: 0, revenue: 0 };
        }
        count[id].count += 1;
        count[id].revenue += Number(s.price);
      });
    });
    return Object.entries(count)
      .map(([id, v]) => ({ serviceId: id, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async revenueByHour(userId: string, startDate: string, endDate: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        paidAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;
    payments.forEach((p) => {
      const h = (p.paidAt as Date).getHours();
      byHour[h] += Number(p.amount);
    });
    return Object.entries(byHour).map(([hour, value]) => ({ hour: +hour, value }));
  }

  async inactiveClients(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const clients = await this.prisma.client.findMany({
      where: {
        userId,
        OR: [{ lastVisitAt: null }, { lastVisitAt: { lt: since } }],
      },
      orderBy: { lastVisitAt: 'asc' },
    });
    return clients;
  }
}
