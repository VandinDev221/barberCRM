const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/** Em produção no browser, usa /api (rewrite do Next) para evitar CORS preflight. */
function buildApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) return `/api${path}`;
  }
  return API_URL ? `${API_URL}/api${path}` : `/api${path}`;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = buildApiUrl(path);
  const res = await fetch(url, { ...options, headers });

  if (res.status === 404 && typeof window !== 'undefined') {
    const isProduction = !window.location.hostname.includes('localhost');
    if (isProduction && !API_URL) {
      throw new Error(
        'API não configurada. Na Vercel, adicione NEXT_PUBLIC_API_URL com a URL do backend no Render (ex: https://seu-backend.onrender.com).'
      );
    }
    const method = (options.method as string) || 'GET';
    throw new Error(
      `Rota não encontrada (404): ${method} ${path}. Faça redeploy do backend no Render.`
    );
  }
  if (res.status === 401) {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      const refreshRes = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        const retry = await fetch(buildApiUrl(path), { ...options, headers });
        if (!retry.ok) throw new Error(await retry.text());
        return retry.json();
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    throw new Error('Não autorizado');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      const m = j.message;
      msg = Array.isArray(m) ? m.join('. ') : m || j.error || text;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const apiGet = <T>(path: string, options: RequestInit = {}) =>
  api<T>(path, { method: 'GET', ...options });
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
