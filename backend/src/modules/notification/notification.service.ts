import { Injectable } from '@nestjs/common';

const FETCH_TIMEOUT_MS = 25_000;

/**
 * Envia notificação por WhatsApp via webhook configurável.
 * Configure WHATSAPP_WEBHOOK_URL (Render) apontando para /api/send-whatsapp na Vercel.
 * Payload: { "phone": "5511999999999", "message": "..." }
 */
@Injectable()
export class NotificationService {
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length <= 11 ? `55${digits}` : digits;
  }

  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    const url = process.env.WHATSAPP_WEBHOOK_URL;
    if (!url || !url.startsWith('http')) return false;

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: this.normalizePhone(phone),
          message,
        }),
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
