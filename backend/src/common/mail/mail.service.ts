import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type PasswordResetEmail = {
  to: string;
  name: string;
  resetUrl: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const apiKey = process.env.RESEND_API_KEY || this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      process.env.EMAIL_FROM ||
      this.config.get<string>('EMAIL_FROM') ||
      'Barber CRM <onboarding@resend.dev>';
  }

  isConfigured(): boolean {
    return Boolean(this.resend);
  }

  async sendPasswordReset({ to, name, resetUrl }: PasswordResetEmail): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY não configurado — e-mail de reset não enviado.');
      return;
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111">
        <h2 style="color:#ea580c">Barber CRM</h2>
        <p>Olá, ${escapeHtml(name)}!</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#ea580c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">
            Redefinir senha
          </a>
        </p>
        <p style="font-size:14px;color:#666">Este link expira em 1 hora. Se você não pediu a redefinição, ignore este e-mail.</p>
        <p style="font-size:12px;color:#999;word-break:break-all">${resetUrl}</p>
      </div>
    `;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Redefinir senha — Barber CRM',
      html,
    });

    if (error) {
      this.logger.error(`Resend error: ${error.message}`);
      throw new Error(error.message);
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
