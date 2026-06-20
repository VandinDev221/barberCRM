import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const FETCH_TIMEOUT_MS = 25_000;
const SETTING_INSTANCE_KEY = 'whatsapp_instance';

export type WhatsAppConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

export type WhatsAppUserStatus = {
  platformConfigured: boolean;
  instance: string | null;
  state: WhatsAppConnectionState;
  connected: boolean;
  qrCode: string | null;
};

@Injectable()
export class WhatsAppService {
  constructor(private prisma: PrismaService) {}

  isPlatformConfigured(): boolean {
    return Boolean(this.getBaseUrl().startsWith('http') && this.getApiKey());
  }

  defaultInstanceName(userId: string): string {
    return `barber-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase()}`;
  }

  async getInstanceName(userId: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({
      where: { userId_key: { userId, key: SETTING_INSTANCE_KEY } },
    });
    return row?.value?.trim() || null;
  }

  private async saveInstanceName(userId: string, instanceName: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { userId_key: { userId, key: SETTING_INSTANCE_KEY } },
      create: { userId, key: SETTING_INSTANCE_KEY, value: instanceName },
      update: { value: instanceName },
    });
  }

  async ensureInstance(userId: string): Promise<string> {
    const existing = await this.getInstanceName(userId);
    if (existing) return existing;

    const instanceName = this.defaultInstanceName(userId);
    await this.createInstance(instanceName);
    await this.saveInstanceName(userId, instanceName);
    return instanceName;
  }

  async getUserStatus(userId: string): Promise<WhatsAppUserStatus> {
    const platformConfigured = this.isPlatformConfigured() || this.canUseVercelProxy();
    if (!platformConfigured) {
      return {
        platformConfigured: false,
        instance: null,
        state: 'unknown',
        connected: false,
        qrCode: null,
      };
    }

    if (!this.isPlatformConfigured()) {
      const instance = await this.getInstanceName(userId);
      return {
        platformConfigured: true,
        instance,
        state: instance ? 'unknown' : 'close',
        connected: false,
        qrCode: null,
      };
    }

    const instance = await this.getInstanceName(userId);
    if (!instance) {
      return {
        platformConfigured: true,
        instance: null,
        state: 'close',
        connected: false,
        qrCode: null,
      };
    }

    const state = await this.getConnectionState(instance);
    let qrCode: string | null = null;
    if (state !== 'open') {
      qrCode = await this.fetchQrCode(instance);
    }

    return {
      platformConfigured: true,
      instance,
      state,
      connected: state === 'open',
      qrCode,
    };
  }

  async connect(userId: string): Promise<WhatsAppUserStatus> {
    if (!this.isPlatformConfigured()) {
      throw new ServiceUnavailableException(
        'Use a tela de Configurações no app para conectar via QR Code (credenciais Evolution na Vercel).',
      );
    }

    const instance = await this.ensureInstance(userId);
    const state = await this.getConnectionState(instance);
    const qrCode = state === 'open' ? null : await this.fetchQrCode(instance);

    return {
      platformConfigured: true,
      instance,
      state,
      connected: state === 'open',
      qrCode,
    };
  }

  async sendForUser(
    userId: string,
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string; details?: string }> {
    const instance = await this.getInstanceName(userId);
    if (!instance) {
      return { ok: false, error: 'Conecte seu WhatsApp em Configurações antes de enviar mensagens.' };
    }

    if (!this.isPlatformConfigured()) {
      if (this.canUseVercelProxy()) {
        return this.sendViaVercelProxy(instance, phone, message);
      }
      return { ok: false, error: 'WhatsApp não configurado na plataforma' };
    }

    const state = await this.getConnectionState(instance);
    if (state !== 'open') {
      return { ok: false, error: 'WhatsApp desconectado. Escaneie o QR Code em Configurações.' };
    }

    return this.sendText(instance, phone, message);
  }

  normalizeBrazilPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    return digits.length <= 11 ? `55${digits}` : digits;
  }

  private getBaseUrl(): string {
    let url = (process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL || '')
      .trim()
      .replace(/\/$/, '');
    url = url.replace(/\/message\/sendText\/[^/?#]+$/i, '');
    return url;
  }

  private canUseVercelProxy(): boolean {
    return Boolean(this.getVercelProxyUrl() && this.getProxySecret());
  }

  private getVercelProxyUrl(): string | null {
    const explicit = process.env.WHATSAPP_VERCEL_PROXY_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    const appUrl = process.env.APP_URL?.trim().replace(/\/$/, '');
    if (appUrl) return `${appUrl}/api/whatsapp/send-for-user`;
    return null;
  }

  private getProxySecret(): string {
    return (
      process.env.WHATSAPP_PROXY_SECRET ||
      process.env.EVOLUTION_API_KEY ||
      process.env.WHATSAPP_API_KEY ||
      ''
    ).trim();
  }

  private async sendViaVercelProxy(
    instance: string,
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string; details?: string }> {
    const url = this.getVercelProxyUrl();
    const secret = this.getProxySecret();
    if (!url || !secret) {
      return { ok: false, error: 'Proxy WhatsApp não configurado' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          instance,
          phone: this.normalizeBrazilPhone(phone),
          message: message.trim(),
        }),
        signal: controller.signal,
      });
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (data as { error?: string }).error || 'Falha ao enviar via proxy',
        details: (data as { details?: string }).details,
      };
    } catch {
      return { ok: false, error: 'Erro de rede ao enviar WhatsApp' };
    } finally {
      clearTimeout(timer);
    }
  }

  private getApiKey(): string {
    return (process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_API_KEY || '').trim();
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.getApiKey(),
    };
  }

  private async evolutionFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init.headers as Record<string, string>) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async createInstance(instanceName: string): Promise<void> {
    const res = await this.evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (res.ok || res.status === 403 || res.status === 409) return;

    const text = await res.text();
    if (/already|exist/i.test(text)) return;

    throw new ServiceUnavailableException(
      `Não foi possível criar instância WhatsApp: ${text.slice(0, 200)}`,
    );
  }

  async getConnectionState(instance: string): Promise<WhatsAppConnectionState> {
    try {
      const res = await this.evolutionFetch(`/instance/connectionState/${encodeURIComponent(instance)}`);
      if (!res.ok) return 'unknown';
      const data = await res.json();
      const state = data?.instance?.state ?? data?.state;
      if (state === 'open' || state === 'connecting' || state === 'close') return state;
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async fetchQrCode(instance: string): Promise<string | null> {
    try {
      const res = await this.evolutionFetch(`/instance/connect/${encodeURIComponent(instance)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return this.extractQrBase64(data);
    } catch {
      return null;
    }
  }

  private extractQrBase64(data: Record<string, unknown>): string | null {
    const candidates = [
      data.base64,
      (data.qrcode as Record<string, unknown> | undefined)?.base64,
      (data.qrcode as Record<string, unknown> | undefined)?.code,
      data.code,
    ];

    for (const value of candidates) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const trimmed = value.trim();
      if (trimmed.startsWith('data:image')) return trimmed;
      return `data:image/png;base64,${trimmed}`;
    }
    return null;
  }

  private async sendText(
    instance: string,
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string; details?: string }> {
    const number = this.normalizeBrazilPhone(phone);
    if (number.length < 12) {
      return { ok: false, error: 'Número inválido. Use DDD + número.' };
    }

    const path = `/message/sendText/${encodeURIComponent(instance)}`;
    const payloads = [{ number, text: message.trim() }, { number, textMessage: { text: message.trim() } }];

    let lastDetails = '';
    for (const body of payloads) {
      try {
        const res = await this.evolutionFetch(path, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (res.ok) return { ok: true };
        lastDetails = await res.text();
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return {
          ok: false,
          error: isTimeout ? 'Timeout ao enviar mensagem. Tente novamente.' : 'Erro de rede ao enviar WhatsApp',
          details: err instanceof Error ? err.message : undefined,
        };
      }
    }

    return { ok: false, error: 'Falha ao enviar WhatsApp', details: lastDetails.slice(0, 500) };
  }
}
