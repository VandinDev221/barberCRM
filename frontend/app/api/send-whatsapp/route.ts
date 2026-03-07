import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook recebido pelo backend (Railway) ao confirmar agendamento.
 * Encaminha para API de WhatsApp não oficial (Z-API, Evolution API, etc.).
 *
 * No Railway (backend): WHATSAPP_WEBHOOK_URL = https://barber-painel.vercel.app/api/send-whatsapp
 * Na Vercel: WHATSAPP_API_URL, opcionalmente WHATSAPP_PROVIDER e headers (ver README).
 */

/** GET: retorna status da configuração WhatsApp (para tela de verificação). Não expõe segredos. */
export async function GET() {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const provider = (process.env.WHATSAPP_PROVIDER || 'zapi').toLowerCase();
  const hasKey = Boolean(process.env.WHATSAPP_API_KEY);
  const configured = Boolean(apiUrl && apiUrl.startsWith('http'));
  return NextResponse.json({
    configured,
    provider: configured ? provider : null,
    hasApiKey: hasKey,
    hint: configured
      ? `URL configurada (${provider})${hasKey ? ', apikey definida' : ' — apikey não definida'}`
      : 'WHATSAPP_API_URL não configurada na Vercel',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body as { phone?: string; message?: string };
    if (!phone || !message) {
      return NextResponse.json(
        { error: 'phone e message são obrigatórios' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const provider = (process.env.WHATSAPP_PROVIDER || 'zapi').toLowerCase();
    if (!apiUrl || !apiUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'WHATSAPP_API_URL não configurada na Vercel' },
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.WHATSAPP_CLIENT_TOKEN) {
      headers['Client-Token'] = process.env.WHATSAPP_CLIENT_TOKEN;
    }
    if (process.env.WHATSAPP_API_KEY) {
      const key = process.env.WHATSAPP_API_KEY;
      if (provider === 'evolution') {
        headers['apikey'] = key;
      } else {
        headers['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
      }
    }

    const phoneOnly = phone.replace(/\D/g, '');
    const number = phoneOnly.length <= 10 ? '55' + phoneOnly : phoneOnly;

    const payload =
      provider === 'evolution'
        ? { number, text: message }
        : { phone: number, message };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('WhatsApp API error:', res.status, text);
      return NextResponse.json(
        { error: 'Falha ao enviar WhatsApp', details: text },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('send-whatsapp error:', e);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
