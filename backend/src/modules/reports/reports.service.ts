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

  async exportCsv(
    userId: string,
    type: 'revenue' | 'top-services' | 'inactive-clients',
    startDate: string,
    endDate: string,
    days = 30,
  ): Promise<{ csv: string; filename: string }> {
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    if (type === 'revenue') {
      const { series, total } = await this.revenueByPeriod(userId, startDate, endDate);
      const lines = [['Data', 'Valor'].map(escape).join(',')];
      series.forEach(({ date, value }) => lines.push([date, value.toFixed(2)].map(escape).join(',')));
      lines.push(['Total', total.toFixed(2)].map(escape).join(','));
      return { csv: lines.join('\n'), filename: `faturamento-${startDate}-${endDate}.csv` };
    }
    if (type === 'top-services') {
      const data = await this.topServices(userId, startDate, endDate);
      const lines = [['Serviço', 'Quantidade', 'Faturamento'].map(escape).join(',')];
      data.forEach((s) =>
        lines.push([(s as any).name, (s as any).count, (s as any).revenue.toFixed(2)].map(escape).join(','))
      );
      return { csv: lines.join('\n'), filename: `servicos-${startDate}-${endDate}.csv` };
    }
    const data = await this.inactiveClients(userId, days);
    const lines = [['Nome', 'Telefone', 'E-mail', 'Última visita'].map(escape).join(',')];
    data.forEach((c) =>
      lines.push(
        [
          c.name,
          c.phone,
          c.email ?? '',
          c.lastVisitAt ? (c.lastVisitAt as Date).toISOString().slice(0, 10) : 'Nunca',
        ].map(escape).join(',')
      )
    );
    return { csv: lines.join('\n'), filename: `clientes-inativos-${days}dias.csv` };
  }
}
