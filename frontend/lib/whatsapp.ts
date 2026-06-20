const FETCH_TIMEOUT_MS = 25_000;

export type WhatsAppStatus = {
  configured: boolean;
  provider: string | null;
  hasApiKey: boolean;
  hasInstance: boolean;
  hint: string;
};

function getProvider(): string {
  return (process.env.WHATSAPP_PROVIDER || 'zapi').toLowerCase();
}

/** Monta URL final da Evolution (aceita base + WHATSAPP_INSTANCE ou URL completa). */
export function resolveWhatsAppApiUrl(): string {
  const raw = process.env.WHATSAPP_API_URL?.trim() || '';
  const instance = process.env.WHATSAPP_INSTANCE?.trim();
  if (!raw) return '';

  if (/\/message\/sendText\/[^/?#]+/i.test(raw)) {
    return raw.replace(/\/$/, '');
  }

  if (instance) {
    const base = raw.replace(/\/$/, '');
    return `${base}/message/sendText/${encodeURIComponent(instance)}`;
  }

  return raw.replace(/\/$/, '');
}

export function normalizeBrazilPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function getWhatsAppStatus(): WhatsAppStatus {
  const apiUrl = resolveWhatsAppApiUrl();
  const provider = getProvider();
  const hasKey = Boolean(process.env.WHATSAPP_API_KEY?.trim());
  const hasInstance =
    Boolean(process.env.WHATSAPP_INSTANCE?.trim()) ||
    /\/message\/sendText\/[^/?#]+/i.test(process.env.WHATSAPP_API_URL || '');

  const configured = Boolean(apiUrl && apiUrl.startsWith('http'));

  let hint = 'WHATSAPP_API_URL não configurada na Vercel';
  if (configured) {
    if (provider === 'evolution' && !hasInstance) {
      hint = `URL base (${provider}), apikey ${hasKey ? 'ok' : 'ausente'} — falta instância (WHATSAPP_INSTANCE ou /message/sendText/nome na URL)`;
    } else {
      hint = `URL configurada (${provider})${hasKey ? ', apikey definida' : ' — apikey não definida'}`;
    }
  }

  return {
    configured: configured && (provider !== 'evolution' || hasInstance),
    provider: configured ? provider : null,
    hasApiKey: hasKey,
    hasInstance,
    hint,
  };
}

function buildHeaders(provider: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.WHATSAPP_CLIENT_TOKEN) {
    headers['Client-Token'] = process.env.WHATSAPP_CLIENT_TOKEN;
  }

  const key = process.env.WHATSAPP_API_KEY?.trim();
  if (key) {
    if (provider === 'evolution') {
      headers.apikey = key;
    } else {
      headers.Authorization = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
    }
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildPayload(provider: string, number: string, message: string, variant: 'plain' | 'nested') {
  if (provider !== 'evolution') {
    return { phone: number, message };
  }
  if (variant === 'nested') {
    return { number, textMessage: { text: message } };
  }
  return { number, text: message };
}

async function postWhatsApp(
  apiUrl: string,
  provider: string,
  number: string,
  message: string,
): Promise<{ ok: true } | { ok: false; status: number; details: string }> {
  const headers = buildHeaders(provider);
  const variants: Array<'plain' | 'nested'> =
    provider === 'evolution' ? ['plain', 'nested'] : ['plain'];

  let lastStatus = 0;
  let lastDetails = '';

  for (const variant of variants) {
    const payload = buildPayload(provider, number, message, variant);
    try {
      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true };

      lastStatus = res.status;
      lastDetails = await res.text();
      if (provider !== 'evolution' || variant === 'nested') break;
      if (lastStatus !== 400 && lastStatus !== 422 && lastStatus !== 500) break;
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        status: isTimeout ? 504 : 502,
        details: isTimeout
          ? `Timeout após ${FETCH_TIMEOUT_MS / 1000}s ao contactar a Evolution API. Verifique se o serviço no Render está online (cold start pode levar ~1 min).`
          : err instanceof Error
            ? err.message
            : 'Erro de rede',
      };
    }
  }

  return { ok: false, status: lastStatus || 502, details: lastDetails || 'Falha ao enviar WhatsApp' };
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string; details?: string }> {
  const status = getWhatsAppStatus();
  if (!status.configured) {
    return {
      ok: false,
      status: 503,
      error: status.hint,
    };
  }

  const number = normalizeBrazilPhone(phone);
  if (number.length < 12) {
    return {
      ok: false,
      status: 400,
      error: 'Número inválido. Use DDD + número (ex.: 98985894988).',
    };
  }

  const apiUrl = resolveWhatsAppApiUrl();
  const provider = getProvider();
  const result = await postWhatsApp(apiUrl, provider, number, message.trim());

  if (result.ok) return { ok: true };

  return {
    ok: false,
    status: result.status,
    error: 'Falha ao enviar WhatsApp',
    details: result.details,
  };
}

export async function sendWhatsAppCampaign(
  phones: string[],
  message: string,
): Promise<{ sent: number; failed: number; total: number; errors: string[] }> {
  const status = getWhatsAppStatus();
  if (!status.configured) {
    throw new Error(status.hint);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const trimmed = message.trim();

  for (const phone of phones) {
    const result = await sendWhatsAppMessage(phone, trimmed);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (errors.length < 5) {
        errors.push(`${phone}: ${result.error}${result.details ? ` — ${result.details.slice(0, 120)}` : ''}`);
      }
    }
    if (phones.length > 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return { sent, failed, total: phones.length, errors };
}
