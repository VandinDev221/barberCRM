const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function backendFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL não configurada');
  }

  return fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string>),
    },
  });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export async function getStoredInstance(token: string): Promise<string | null> {
  const res = await backendFetch('/settings?key=whatsapp_instance', token);
  if (res.status === 401) throw new Error('Não autorizado');
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: string } | null;
  return data?.value?.trim() || null;
}

export async function saveInstance(token: string, instance: string): Promise<void> {
  const res = await backendFetch('/settings', token, {
    method: 'PATCH',
    body: JSON.stringify({ key: 'whatsapp_instance', value: instance }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao salvar instância');
  }
}

export function decodeUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string };
    return json.sub || null;
  } catch {
    return null;
  }
}
