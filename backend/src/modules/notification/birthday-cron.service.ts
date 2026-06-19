import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';

/**
 * Envia mensagem de aniversário por WhatsApp automaticamente, sem interação do admin.
 * Roda todo dia às 09:00 no fuso do barbeiro (por padrão 12:00 UTC = 09:00 Brasil).
 * Exige: WHATSAPP_WEBHOOK_URL configurado e BIRTHDAY_WHATSAPP_ENABLED=true (opcional, default true).
 */
@Injectable()
export class BirthdayCronService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
  ) {}

  @Cron('0 12 * * *')
  async sendBirthdayGreetings() {
    if (process.env.BIRTHDAY_WHATSAPP_ENABLED === 'false') return;

    const userId = await this.getDefaultUserId();
    const offsetHours = parseInt(process.env.BARBER_TZ_OFFSET_HOURS ?? '3', 10);
    const barberNow = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const todayMonth = barberNow.getUTCMonth();
    const todayDay = barberNow.getUTCDate();

    const clients = await this.prisma.client.findMany({
      where: {
        userId,
        birthDate: { not: null },
      },
      select: { name: true, phone: true, birthDate: true },
    });

    const template = await this.getBirthdayMessageTemplate(userId);
    for (const c of clients) {
      if (!c.birthDate) continue;
      const b = new Date(c.birthDate);
      if (b.getUTCMonth() !== todayMonth || b.getUTCDate() !== todayDay) continue;
      const message = template.replace(/\{\{name\}\}/g, c.name);
      await this.notification.sendWhatsApp(c.phone, message);
    }
  }

  private async getBirthdayMessageTemplate(userId: string): Promise<string> {
    const s = await this.prisma.setting.findUnique({
      where: { userId_key: { userId, key: 'birthday_message' } },
    });
    return (s?.value?.trim() && s.value) || 'Olá {{name}}! A equipe da barbearia deseja um feliz aniversário! 🎉 Que este dia seja especial. Até a próxima!';
  }

  private async getDefaultUserId(): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!user) return '';
    return user.id;
  }
}
