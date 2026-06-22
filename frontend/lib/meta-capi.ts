type MetaCapiEvent = {
  event_name: string;
  event_time: number;
  action_source: 'website';
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
  };
  event_source_url: string;
};

export async function verifyMetaPixelAccess(
  pixelId: string,
  accessToken: string,
): Promise<{ ok: boolean; name?: string; error?: string; hint?: string; response?: unknown }> {
  const url = `https://graph.facebook.com/v21.0/${pixelId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const subcode = (data as { error?: { error_subcode?: number } }).error?.error_subcode;
      return {
        ok: false,
        error: (data as { error?: { message?: string } }).error?.message || res.statusText,
        hint:
          subcode === 33
            ? 'Token sem permissão para este pixel ou ID incorreto. Gere o token em: Gerenciador de Eventos → seu Pixel → Configurações → Conversions API → Gerar token de acesso.'
            : 'Confira se NEXT_PUBLIC_META_PIXEL_ID é o ID do pixel (não é ID do app nem da conta de anúncios).',
        response: data,
      };
    }
    const name = (data as { name?: string }).name;
    return { ok: true, name, response: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de rede' };
  }
}

export async function sendMetaCapiTestEvent(options: {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  eventSourceUrl: string;
  clientIp?: string;
  userAgent?: string;
  eventName?: string;
}): Promise<{ ok: boolean; response?: unknown; error?: string; hint?: string }> {
  const payload = {
    data: [
      {
        event_name: options.eventName || 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website' as const,
        event_source_url: options.eventSourceUrl,
        user_data: {
          ...(options.clientIp ? { client_ip_address: options.clientIp } : {}),
          ...(options.userAgent ? { client_user_agent: options.userAgent } : {}),
        },
      } satisfies MetaCapiEvent,
    ],
    test_event_code: options.testEventCode,
  };

  const url = `https://graph.facebook.com/v21.0/${options.pixelId}/events?access_token=${encodeURIComponent(options.accessToken)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const subcode = (data as { error?: { error_subcode?: number } }).error?.error_subcode;
      return {
        ok: false,
        error: (data as { error?: { message?: string } }).error?.message || res.statusText,
        hint:
          subcode === 33
            ? 'Use o token gerado no Gerenciador de Eventos (Conversions API), não um token genérico do Graph API Explorer.'
            : undefined,
        response: data,
      };
    }
    return { ok: true, response: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de rede' };
  }
}
