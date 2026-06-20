import { NextRequest, NextResponse } from 'next/server';
import {
  getEvolutionConnectionState,
  isEvolutionPlatformConfigured,
  sendEvolutionText,
} from '@/lib/evolution-platform';
import { getBearerToken, getStoredInstance } from '@/lib/backend-server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!isEvolutionPlatformConfigured()) {
    return NextResponse.json({ error: 'Evolution API não configurada na Vercel' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { phone, message } = body as { phone?: string; message?: string };
    if (!phone || !message?.trim()) {
      return NextResponse.json({ error: 'phone e message são obrigatórios' }, { status: 400 });
    }

    const instance = await getStoredInstance(token);
    if (!instance) {
      return NextResponse.json(
        { error: 'Conecte seu WhatsApp antes de enviar (escaneie o QR Code).' },
        { status: 400 },
      );
    }

    const state = await getEvolutionConnectionState(instance);
    if (state !== 'open') {
      return NextResponse.json(
        { error: 'WhatsApp desconectado. Escaneie o QR Code novamente.' },
        { status: 400 },
      );
    }

    const result = await sendEvolutionText(instance, phone, message.trim());
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
