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
    const qrResult = state === 'open' ? null : await fetchEvolutionQrCode(instance);
    const status = await buildUserStatus(instance);

    if (state === 'open') {
      return NextResponse.json({
        ...status,
        state: 'open',
        connected: true,
        qrCode: null,
      });
    }

    const qrCode = qrResult?.qrCode ?? null;
    const pairingCode = qrResult?.pairingCode ?? null;

    if (!qrCode && !pairingCode) {
      return NextResponse.json(
        {
          error:
            qrResult?.error ||
            'Não foi possível obter o QR Code. Aguarde 1 minuto e clique em "Atualizar QR Code".',
          details: qrResult?.details,
          instance,
          state,
        },
        { status: qrResult?.httpStatus === 429 ? 429 : 502 },
      );
    }

    return NextResponse.json({
      ...status,
      instance,
      state: state === 'unknown' ? status.state : state,
      connected: false,
      qrCode,
      pairingCode,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao conectar';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
