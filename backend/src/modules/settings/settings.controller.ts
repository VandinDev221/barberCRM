import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private settings: SettingsService,
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar configurações' })
  get(@CurrentUser('sub') userId: string, @Query('key') key?: string) {
    return this.settings.get(userId, key);
  }

  @Patch()
  @ApiOperation({ summary: 'Definir configuração (key/value)' })
  set(
    @CurrentUser('sub') userId: string,
    @Body() body: { key: string; value: string },
  ) {
    return this.settings.set(userId, body.key, body.value);
  }

  @Get('whatsapp')
  @ApiOperation({ summary: 'Status da conexão WhatsApp do barbeiro' })
  getWhatsApp(@CurrentUser('sub') userId: string) {
    return this.whatsapp.getUserStatus(userId);
  }

  @Post('whatsapp/connect')
  @ApiOperation({ summary: 'Criar instância e obter QR Code para conectar WhatsApp' })
  connectWhatsApp(@CurrentUser('sub') userId: string) {
    return this.whatsapp.connect(userId);
  }

  @Post('whatsapp/test')
  @ApiOperation({ summary: 'Enviar mensagem de teste pelo WhatsApp conectado' })
  async testWhatsApp(
    @CurrentUser('sub') userId: string,
    @Body() body: { phone?: string; message?: string },
  ) {
    const { phone, message } = body;
    if (!phone || !message?.trim()) {
      throw new BadRequestException('phone e message são obrigatórios');
    }
    const result = await this.whatsapp.sendForUser(userId, phone, message.trim());
    if (!result.ok) {
      throw new BadRequestException({
        message: result.error || 'Falha ao enviar',
        details: result.details,
      });
    }
    return { ok: true };
  }

  @Post('campaign')
  @ApiOperation({ summary: 'Enviar campanha WhatsApp para clientes selecionados' })
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
    const errors: string[] = [];

    for (const c of clients) {
      const result = await this.whatsapp.sendForUser(userId, c.phone, message.trim());
      if (result.ok) {
        sent++;
      } else {
        failed++;
        if (errors.length < 5) {
          errors.push(`${c.name}: ${result.error || 'falha'}`);
        }
      }
      if (clients.length > 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    return { sent, failed, total: clients.length, errors };
  }
}
