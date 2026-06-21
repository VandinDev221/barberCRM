import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * Envia WhatsApp usando a instância conectada pelo barbeiro em Configurações.
 * Plataforma: EVOLUTION_API_URL + EVOLUTION_API_KEY no servidor (Render).
 */
@Injectable()
export class NotificationService {
  constructor(private whatsapp: WhatsAppService) {}

  async sendWhatsApp(
    userId: string,
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.whatsapp.sendForUser(userId, phone, message);
    return { ok: result.ok, error: result.error };
  }
}
