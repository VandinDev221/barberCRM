import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppCampaign } from '@/lib/whatsapp';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Campanha: envia mensagem para vários números via WhatsApp (Evolution/Z-API). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phones, message } = body as { phones?: string[]; message?: string };

    if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
      return NextResponse.json(
        { error: 'phones (array) e message são obrigatórios' },
        { status: 400 },
      );
    }

    const result = await sendWhatsAppCampaign(phones, message);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno';
    console.error('campaign error:', e);
    return NextResponse.json({ error: msg }, { status: msg.includes('WHATSAPP') ? 503 : 500 });
  }
}
