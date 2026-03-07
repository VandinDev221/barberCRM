import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private loyalty: LoyaltyService,
  ) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    const start = new Date(dto.startAt);
    const end = dto.endAt ? new Date(dto.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    const appointment = await this.prisma.appointment.create({
      data: {
        userId,
        clientId: dto.clientId,
        startAt: start,
        endAt: end,
        status: 'scheduled',
        notes: dto.notes,
        services: {
          create: dto.serviceItems.map((s) => ({
            serviceId: s.serviceId,
            price: s.price,
          })),
        },
      },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });
    return appointment;
  }

  async findAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    const where: Prisma.AppointmentWhereInput = { userId };
    if (startDate || endDate) {
      where.startAt = {};
      if (startDate) (where.startAt as Prisma.DateTimeFilter).gte = new Date(startDate + 'T00:00:00');
      if (endDate) {
        const endOfDay = new Date(endDate + 'T00:00:00');
        endOfDay.setHours(23, 59, 59, 999);
        (where.startAt as Prisma.DateTimeFilter).lte = endOfDay;
      }
    }
    if (status) where.status = status;
    const items = await this.prisma.appointment.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });
    return { items };
  }

  async findOne(userId: string, id: string) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, userId },
      include: {
        client: true,
        services: { include: { service: true } },
        payment: true,
      },
    });
    if (!apt) throw new NotFoundException('Agendamento não encontrado');
    return apt;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
    await this.findOne(userId, id);
    const data: Prisma.AppointmentUpdateInput = {};
    if (dto.startAt) data.startAt = new Date(dto.startAt);
    if (dto.endAt) data.endAt = new Date(dto.endAt);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status) data.status = dto.status;
    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });
  }

  async setStatus(userId: string, id: string, status: string) {
    const apt = await this.findOne(userId, id);
    if (status === 'completed') {
      const total = apt.services.reduce((s, i) => s + Number(i.price), 0);
      await this.prisma.payment.create({
        data: {
          userId,
          clientId: apt.clientId,
          appointmentId: id,
          amount: total,
          method: 'cash',
          paidAt: new Date(),
        },
      });
      await this.prisma.client.update({
        where: { id: apt.clientId },
        data: {
          lastVisitAt: new Date(),
          totalSpent: { increment: total },
          visitCount: { increment: 1 },
        },
      });
      await this.loyalty.addVisit(apt.clientId);
    }
    return this.update(userId, id, { status: status as any });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.appointmentService.deleteMany({ where: { appointmentId: id } });
    await this.prisma.appointment.delete({ where: { id } });
    return { message: 'Agendamento removido' };
  }
}
