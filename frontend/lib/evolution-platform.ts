const FETCH_TIMEOUT_MS = 25_000;

export type EvolutionConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

export function getEvolutionBaseUrl(): string {
  let url = (
    process.env.EVOLUTION_API_URL ||
    process.env.WHATSAPP_API_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  url = url.replace(/\/message\/sendText\/[^/?#]+$/i, '');
  return url;
}

export function getEvolutionApiKey(): string {
  return (process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_API_KEY || '').trim();
}

export function isEvolutionPlatformConfigured(): boolean {
  return Boolean(getEvolutionBaseUrl().startsWith('http') && getEvolutionApiKey());
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: getEvolutionApiKey(),
  };
}

async function evolutionFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${getEvolutionBaseUrl()}${path}`, {
      ...init,
      headers: { ...headers(), ...(init.headers as Record<string, string>) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function defaultInstanceName(userId: string): string {
  return `barber-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase()}`;
}

export async function evolutionInstanceExists(instanceName: string): Promise<boolean> {
  try {
    const res = await evolutionFetch(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
    if (res.status === 404) return false;
    if (res.ok || res.status === 429) return true;
    const text = await res.text();
    return /not found|does not exist/i.test(text) ? false : true;
  } catch {
    return false;
  }
}

/** Cria instância só se ainda não existir na Evolution (evita 429 por cliques repetidos). */
export async function ensureEvolutionInstance(instanceName: string): Promise<void> {
  if (await evolutionInstanceExists(instanceName)) return;

  const res = await evolutionFetch('/instance/create', {
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

  if (await evolutionInstanceExists(instanceName)) return;

  throw new Error(
    text.includes('Too Many Requests')
      ? 'Muitas tentativas seguidas. Aguarde 1 minuto e clique em "Atualizar QR Code".'
      : `Não foi possível preparar instância: ${text.slice(0, 200)}`,
  );
}

/** @deprecated use ensureEvolutionInstance */
export async function createEvolutionInstance(instanceName: string): Promise<void> {
  return ensureEvolutionInstance(instanceName);
}

export async function getEvolutionConnectionState(
  instance: string,
): Promise<EvolutionConnectionState> {
  try {
    const res = await evolutionFetch(`/instance/connectionState/${encodeURIComponent(instance)}`);
    if (!res.ok) return 'unknown';
    const data = await res.json();
    const state = data?.instance?.state ?? data?.state;
    if (state === 'open' || state === 'connecting' || state === 'close') return state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function extractQrBase64(data: Record<string, unknown>): string | null {
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

export async function fetchEvolutionQrCode(instance: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
      const res = await evolutionFetch(`/instance/connect/${encodeURIComponent(instance)}`);
      if (res.status === 429) continue;
      if (!res.ok) return null;
      const data = await res.json();
      return extractQrBase64(data);
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

export function normalizeBrazilPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 11 ? `55${digits}` : digits;
}

export async function sendEvolutionText(
  instance: string,
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string; details?: string }> {
  const number = normalizeBrazilPhone(phone);
  if (number.length < 12) {
    return { ok: false, error: 'Número inválido. Use DDD + número.' };
  }

  const path = `/message/sendText/${encodeURIComponent(instance)}`;
  const payloads = [{ number, text: message.trim() }, { number, textMessage: { text: message.trim() } }];
  let lastDetails = '';

  for (const body of payloads) {
    try {
      const res = await evolutionFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) return { ok: true };
      lastDetails = await res.text();
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        error: isTimeout ? 'Timeout ao enviar. Tente novamente.' : 'Erro de rede',
        details: err instanceof Error ? err.message : undefined,
      };
    }
  }

  return { ok: false, error: 'Falha ao enviar WhatsApp', details: lastDetails.slice(0, 500) };
}

export type WhatsAppUserStatusDto = {
  platformConfigured: boolean;
  instance: string | null;
  state: EvolutionConnectionState;
  connected: boolean;
  qrCode: string | null;
};

export async function buildUserStatus(
  instance: string | null,
  options?: { includeQr?: boolean },
): Promise<WhatsAppUserStatusDto> {
  if (!isEvolutionPlatformConfigured()) {
    return {
      platformConfigured: false,
      instance: null,
      state: 'unknown',
      connected: false,
      qrCode: null,
    };
  }

  if (!instance) {
    return {
      platformConfigured: true,
      instance: null,
      state: 'close',
      connected: false,
      qrCode: null,
    };
  }

  const state = await getEvolutionConnectionState(instance);
  const qrCode =
    options?.includeQr && state !== 'open' ? await fetchEvolutionQrCode(instance) : null;

  return {
    platformConfigured: true,
    instance,
    state,
    connected: state === 'open',
    qrCode,
  };
}
