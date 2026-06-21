import { NextRequest, NextResponse } from 'next/server';
import {
  getEvolutionConnectionState,
  getWhatsAppProxySecret,
  isEvolutionPlatformConfigured,
  sendEvolutionText,
} from '@/lib/evolution-platform';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Chamado pelo backend (Render) quando Evolution está configurada na Vercel, não no Render. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, instance, phone, message } = body as {
      secret?: string;
      instance?: string;
      phone?: string;
      message?: string;
    };

    const expected = getWhatsAppProxySecret();
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!isEvolutionPlatformConfigured()) {
      return NextResponse.json({ error: 'Evolution não configurada na Vercel' }, { status: 503 });
    }

    if (!instance || !phone || !message?.trim()) {
      return NextResponse.json({ error: 'instance, phone e message são obrigatórios' }, { status: 400 });
    }

    const state = await getEvolutionConnectionState(instance);
    if (state !== 'open') {
      return NextResponse.json({ error: 'WhatsApp desconectado' }, { status: 400 });
    }

    const result = await sendEvolutionText(instance, phone, message.trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.error, details: result.details }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
