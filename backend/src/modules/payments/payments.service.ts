import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        clientId: dto.clientId,
        appointmentId: dto.appointmentId,
        amount: dto.amount,
        method: dto.method,
        paidAt,
      },
      include: { client: true },
    });
    await this.prisma.client.update({
      where: { id: dto.clientId },
      data: {
        totalSpent: { increment: dto.amount },
        lastVisitAt: paidAt,
      },
    });
    return payment;
  }

  async findAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.PaymentWhereInput = { userId };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) (where.paidAt as Prisma.DateTimeFilter).gte = new Date(startDate);
      if (endDate) (where.paidAt as Prisma.DateTimeFilter).lte = new Date(endDate);
    }
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: { client: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    const sumResult = await this.prisma.payment.aggregate({
      where,
      _sum: { amount: true },
    });
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalAmount: Number(sumResult._sum.amount ?? 0),
    };
  }

  async findOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId },
      include: { client: true, appointment: true },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    return payment;
  }

  async getSummary(userId: string, startDate: string, endDate: string) {
    const where: Prisma.PaymentWhereInput = {
      userId,
      paidAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };
    const [byMethod, total] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['method'],
        where,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
    ]);
    return {
      totalAmount: Number(total._sum.amount ?? 0),
      totalCount: total._count,
      byMethod: byMethod.map((m) => ({ method: m.method, amount: Number(m._sum.amount ?? 0) })),
    };
  }
}
