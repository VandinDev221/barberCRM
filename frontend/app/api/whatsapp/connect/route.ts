import { NextRequest, NextResponse } from 'next/server';
import {
  buildUserStatus,
  defaultInstanceName,
  ensureEvolutionInstance,
  fetchEvolutionQrCode,
  getEvolutionConnectionState,
  isEvolutionPlatformConfigured,
} from '@/lib/evolution-platform';
import {
  decodeUserIdFromToken,
  getBearerToken,
  getStoredInstance,
  saveInstance,
} from '@/lib/backend-server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!isEvolutionPlatformConfigured()) {
    return NextResponse.json(
      {
        error:
          'Evolution API não configurada. Na Vercel, adicione EVOLUTION_API_URL e EVOLUTION_API_KEY (ou WHATSAPP_API_URL e WHATSAPP_API_KEY).',
      },
      { status: 503 },
    );
  }

  try {
    let instance = await getStoredInstance(token);
    if (!instance) {
      const userId = decodeUserIdFromToken(token);
      instance = userId ? defaultInstanceName(userId) : `barber-${Date.now().toString(36)}`;
      await saveInstance(token, instance);
    }

    await ensureEvolutionInstance(instance);

    const state = await getEvolutionConnectionState(instance);
    const qrCode = state === 'open' ? null : await fetchEvolutionQrCode(instance);
    const status = await buildUserStatus(instance);
      return NextResponse.json(
        {
          error:
            'Evolution API ocupada (limite de requisições). Aguarde 1 minuto e clique em "Atualizar QR Code".',
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      ...status,
      qrCode: qrCode || status.qrCode,
      state: state === 'unknown' ? status.state : state,
      connected: state === 'open',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao conectar';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
