import { apiGet, apiPost } from '@/lib/api';

export type WhatsAppStatus = {
  platformConfigured: boolean;
  instance: string | null;
  state: 'open' | 'connecting' | 'close' | 'unknown';
  connected: boolean;
  qrCode: string | null;
  pairingCode?: string | null;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers as Record<string, string>),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error || res.statusText;
    const details = (data as { details?: string }).details;
    throw new Error(details ? `${msg}: ${details}` : msg);
  }
  return data as T;
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus & { source?: 'backend' | 'vercel' }> {
  try {
    const backend = await apiGet<WhatsAppStatus>('/settings/whatsapp');
    if (backend.platformConfigured) {
      return { ...backend, source: 'backend' };
    }
  } catch {
    // tenta Vercel
  }

  return { ...(await vercelFetch<WhatsAppStatus>('/api/whatsapp/status')), source: 'vercel' };
}

/** QR Code via Vercel (Evolution); backend só envia mensagens quando configurado no Render. */
export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  try {
    return await vercelFetch<WhatsAppStatus>('/api/whatsapp/connect', { method: 'POST' });
  } catch (vercelErr) {
    try {
      const backend = await apiGet<WhatsAppStatus>('/settings/whatsapp');
      if (backend.platformConfigured) {
        return apiPost<WhatsAppStatus>('/settings/whatsapp/connect');
      }
    } catch {
      // ignore
    }
    throw vercelErr;
  }
}

export async function testWhatsApp(phone: string, message: string): Promise<void> {
  try {
    const status = await apiGet<WhatsAppStatus>('/settings/whatsapp');
    if (status.platformConfigured && status.connected) {
      await apiPost('/settings/whatsapp/test', { phone, message });
      return;
    }
  } catch {
    // fallback
  }

  await vercelFetch('/api/whatsapp/test', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
}
