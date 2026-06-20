import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppStatus, sendWhatsAppMessage } from '@/lib/whatsapp';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Webhook recebido pelo backend (Render) ao confirmar agendamento.
 * Encaminha para Evolution API / Z-API configuradas na Vercel.
 *
 * Render (backend): WHATSAPP_WEBHOOK_URL = https://seu-frontend.vercel.app/api/send-whatsapp
 * Vercel: WHATSAPP_API_URL, WHATSAPP_PROVIDER=evolution, WHATSAPP_API_KEY, WHATSAPP_INSTANCE
 */

export async function GET() {
  return NextResponse.json(getWhatsAppStatus());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body as { phone?: string; message?: string };

    if (!phone || !message?.trim()) {
      return NextResponse.json({ error: 'phone e message são obrigatórios' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(phone, message);
    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    console.error('WhatsApp API error:', result.status, result.details);
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  } catch (e) {
    console.error('send-whatsapp error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
