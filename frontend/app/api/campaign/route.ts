import { NextRequest, NextResponse } from 'next/server';

/**
 * Campanha: envia a mesma mensagem para vários números via WhatsApp (Evolution/Z-API).
 * Chamado pela tela Configurações → Campanhas. Não depende do backend Railway.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phones, message } = body as { phones?: string[]; message?: string };
    if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
      return NextResponse.json(
        { error: 'phones (array) e message são obrigatórios' },
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

    let sent = 0;
    let failed = 0;
    for (const phone of phones) {
      const phoneOnly = String(phone).replace(/\D/g, '');
      const number = phoneOnly.length <= 11 ? '55' + phoneOnly : phoneOnly;
      const payload =
        provider === 'evolution'
          ? { number, text: message.trim() }
          : { phone: number, message: message.trim() };
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return NextResponse.json({ sent, failed, total: phones.length });
  } catch (e) {
    console.error('campaign error:', e);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
