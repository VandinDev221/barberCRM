import { Injectable } from '@nestjs/common';

/**
 * Envia notificação por WhatsApp via webhook configurável.
 * Configure WHATSAPP_WEBHOOK_URL (e opcionalmente WHATSAPP_WEBHOOK_HEADERS em JSON)
 * para apontar para um serviço que envia WhatsApp (Z-API, Evolution API, Zapier, etc.).
 * Payload enviado: { "phone": "5511999999999", "message": "..." }
 */
@Injectable()
export class NotificationService {
  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    const url = process.env.WHATSAPP_WEBHOOK_URL;
    if (!url || !url.startsWith('http')) return false;

    const normalizedPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = normalizedPhone.length <= 10 ? '55' + normalizedPhone : normalizedPhone;

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const extraHeaders = process.env.WHATSAPP_WEBHOOK_HEADERS;
    if (extraHeaders) {
      try {
        headers = { ...headers, ...JSON.parse(extraHeaders) };
      } catch {
        // ignore invalid JSON
      }
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: phoneWithCountry, message }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
