import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
  pairingCode?: string | null;
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

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
    if (existing) {
      await this.ensureInstanceOnEvolution(existing);
      return existing;
    }

    const instanceName = this.defaultInstanceName(userId);
    await this.saveInstanceName(userId, instanceName);
    await this.ensureInstanceOnEvolution(instanceName);
    return instanceName;
  }

  private async instanceExistsOnEvolution(instanceName: string): Promise<boolean> {
    try {
      const res = await this.evolutionFetch(
        `/instance/connectionState/${encodeURIComponent(instanceName)}`,
      );
      if (res.status === 404) return false;
      if (res.ok || res.status === 429) return true;
      const text = await res.text();
      return !/not found|does not exist/i.test(text);
    } catch {
      return false;
    }
  }

  private async ensureInstanceOnEvolution(instanceName: string): Promise<void> {
    if (await this.instanceExistsOnEvolution(instanceName)) return;

    const res = await this.evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (res.ok || res.status === 403 || res.status === 409 || res.status === 429) return;

    const text = await res.text();
    if (/already|exist|duplicate|too many|rate limit/i.test(text)) return;

    if (await this.instanceExistsOnEvolution(instanceName)) return;

    throw new ServiceUnavailableException(
      text.includes('Too Many Requests')
        ? 'Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.'
        : `Não foi possível preparar instância WhatsApp: ${text.slice(0, 200)}`,
    );
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

    return {
      platformConfigured: true,
      instance,
      state,
      connected: state === 'open',
      qrCode: null,
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
    const qrResult = state === 'open' ? null : await this.fetchQrCode(instance);

    return {
      platformConfigured: true,
      instance,
      state,
      connected: state === 'open',
      qrCode: qrResult?.qrCode ?? null,
      pairingCode: qrResult?.pairingCode ?? null,
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

    // Evolution costuma estar só na Vercel; o proxy envia usando a mesma instância conectada no app.
    if (this.canUseVercelProxy()) {
      const viaProxy = await this.sendViaVercelProxy(instance, phone, message);
      if (viaProxy.ok) return viaProxy;
      if (!this.isPlatformConfigured()) {
        this.logger.warn(
          `WhatsApp via proxy falhou (${viaProxy.error ?? 'erro desconhecido'}) — userId=${userId}`,
        );
        return viaProxy;
      }
    }

    if (!this.isPlatformConfigured()) {
      return {
        ok: false,
        error:
          'WhatsApp não configurado no servidor. No Render, defina APP_URL e WHATSAPP_PROXY_SECRET (mesmo valor de WHATSAPP_API_KEY na Vercel).',
      };
    }

    const state = await this.getConnectionState(instance);
    if (state !== 'open') {
      return { ok: false, error: 'WhatsApp desconectado. Escaneie o QR Code em Configurações.' };
    }

    const direct = await this.sendText(instance, phone, message);
    if (!direct.ok) {
      this.logger.warn(`WhatsApp direto falhou (${direct.error ?? 'erro'}) — userId=${userId}`);
    }
    return direct;
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

    for (const key of ['FRONTEND_URL', 'APP_URL'] as const) {
      const base = process.env[key]?.trim().replace(/\/$/, '');
      if (base?.startsWith('http')) {
        return `${base}/api/whatsapp/send-for-user`;
      }
    }
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
    return this.ensureInstanceOnEvolution(instanceName);
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

  private async fetchQrCode(
    instance: string,
  ): Promise<{ qrCode: string | null; pairingCode: string | null }> {
    for (const method of ['GET', 'POST'] as const) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2500));
          const res = await this.evolutionFetch(`/instance/connect/${encodeURIComponent(instance)}`, {
            method,
            body: method === 'POST' ? JSON.stringify({}) : undefined,
          });
          if (res.status === 429) continue;
          if (!res.ok) continue;
          const data = (await res.json()) as Record<string, unknown>;
          const qrCode = this.extractQrBase64(data);
          const pairingCode = this.extractPairingCode(data);
          if (qrCode || pairingCode) return { qrCode, pairingCode };
        } catch {
          if (attempt === 1) continue;
        }
      }
    }
    return { qrCode: null, pairingCode: null };
  }

  private extractPairingCode(data: Record<string, unknown>): string | null {
    const candidates = [
      data.pairingCode,
      (data.qrcode as Record<string, unknown> | undefined)?.pairingCode,
    ];
    for (const value of candidates) {
      if (typeof value === 'string' && /^\d{8}$/.test(value.trim())) return value.trim();
    }
    return null;
  }

  private extractQrBase64(data: Record<string, unknown>): string | null {
    const findImage = (obj: unknown, depth = 0): string | null => {
      if (depth > 6 || !obj || typeof obj !== 'object') return null;
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.trim()) {
          const trimmed = value.trim();
          const keyLower = key.toLowerCase();
          if (
            keyLower.includes('base64') ||
            trimmed.startsWith('data:image') ||
            (trimmed.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed.slice(0, 300)))
          ) {
            if (trimmed.startsWith('data:image')) return trimmed;
            return `data:image/png;base64,${trimmed.replace(/\s/g, '')}`;
          }
        }
        if (value && typeof value === 'object') {
          const nested = findImage(value, depth + 1);
          if (nested) return nested;
        }
      }
      return null;
    };
    return findImage(data);
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
