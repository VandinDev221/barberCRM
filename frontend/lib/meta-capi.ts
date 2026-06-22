type MetaCapiEvent = {
  event_name: string;
  event_time: number;
  action_source: 'website';
  event_source_url: string;
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
  };
};

export async function sendMetaCapiTestEvent(options: {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  eventSourceUrl: string;
  clientIp?: string;
  userAgent?: string;
  eventName?: string;
}): Promise<{ ok: boolean; response?: unknown; error?: string }> {
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
      return {
        ok: false,
        error: (data as { error?: { message?: string } }).error?.message || res.statusText,
        response: data,
      };
    }
    return { ok: true, response: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de rede' };
  }
}
