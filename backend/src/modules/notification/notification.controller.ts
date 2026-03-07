import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
  ) {}

  @Post('campaign')
  @ApiOperation({ summary: 'Enviar campanha: mensagem WhatsApp para clientes selecionados' })
  async sendCampaign(
    @CurrentUser('sub') userId: string,
    @Body() body: { clientIds: string[]; message: string },
  ) {
    const { clientIds, message } = body;
    if (!Array.isArray(clientIds) || clientIds.length === 0 || !message?.trim()) {
      throw new BadRequestException('clientIds (array) e message são obrigatórios');
    }
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds }, userId },
      select: { id: true, phone: true, name: true },
    });
    let sent = 0;
    let failed = 0;
    for (const c of clients) {
      const ok = await this.notification.sendWhatsApp(c.phone, message.trim());
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed, total: clients.length };
  }
}
