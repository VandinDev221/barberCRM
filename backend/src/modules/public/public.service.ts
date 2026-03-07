import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PublicBookingDto } from './dto/public-booking.dto';

const SLOT_MINUTES = 30;
const WORK_START = 8;
const WORK_END = 18;

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  private async getDefaultUserId(): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Sistema não configurado para agendamento.');
    return user.id;
  }

  async getServices() {
    const userId = await this.getDefaultUserId();
    return this.prisma.service.findMany({
      where: { userId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSlots(dateStr: string) {
    const userId = await this.getDefaultUserId();
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) throw new BadRequestException('Data inválida');
    const dayStart = new Date(date);
    dayStart.setHours(WORK_START, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(WORK_END, 0, 0, 0);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId,
        startAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['cancelled'] },
      },
      select: { startAt: true, endAt: true },
    });

    const slots: { time: string; endTime: string; available: boolean }[] = [];
    const slotMs = SLOT_MINUTES * 60 * 1000;
    for (let t = dayStart.getTime(); t < dayEnd.getTime(); t += slotMs) {
      const slotStart = new Date(t);
      const slotEnd = new Date(t + slotMs);
      const overlaps = appointments.some(
        (a) =>
          (slotStart >= (a.startAt as Date) && slotStart < (a.endAt as Date)) ||
          (slotEnd > (a.startAt as Date) && slotEnd <= (a.endAt as Date)) ||
          (slotStart <= (a.startAt as Date) && slotEnd >= (a.endAt as Date))
      );
      const h = slotStart.getHours();
      const m = slotStart.getMinutes();
      const eh = slotEnd.getHours();
      const em = slotEnd.getMinutes();
      slots.push({
        time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        endTime: `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`,
        available: !overlaps,
      });
    }
    return { slots };
  }

  async createBooking(dto: PublicBookingDto) {
    const userId = await this.getDefaultUserId();
    const [year, month, day] = dto.date.split('-').map(Number);
    const [hour, min] = dto.time.split(':').map(Number);
    const startAt = new Date(year, month - 1, day, hour, min, 0);
    if (isNaN(startAt.getTime())) throw new BadRequestException('Data/hora inválida');

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds }, userId, isActive: true },
    });
    if (services.length !== dto.serviceIds.length) {
      throw new BadRequestException('Um ou mais serviços não encontrados ou inativos.');
    }

    let totalMinutes = 0;
    const serviceItems = services.map((s) => {
      totalMinutes += s.duration;
      return { serviceId: s.id, price: Number(s.price) };
    });
    const endAt = new Date(startAt.getTime() + totalMinutes * 60 * 1000);

    let client = await this.prisma.client.findFirst({
      where: { userId, phone: dto.phone },
    });
    if (!client) {
      client = await this.prisma.client.create({
        data: {
          userId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email ?? null,
        },
      });
    } else if (dto.name && client.name !== dto.name) {
      await this.prisma.client.update({
        where: { id: client.id },
        data: { name: dto.name, email: dto.email ?? client.email },
      });
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        userId,
        clientId: client.id,
        startAt,
        endAt,
        status: 'scheduled',
        notes: 'Agendamento pelo link público',
        services: {
          create: serviceItems,
        },
      },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });
    return appointment;
  }
}
