import { NextRequest, NextResponse } from 'next/server';
import {
  buildUserStatus,
  isEvolutionPlatformConfigured,
} from '@/lib/evolution-platform';
import { getBearerToken, getStoredInstance } from '@/lib/backend-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!isEvolutionPlatformConfigured()) {
    return NextResponse.json({
      platformConfigured: false,
      instance: null,
      state: 'unknown',
      connected: false,
      qrCode: null,
      missingEnv: ['EVOLUTION_API_URL ou WHATSAPP_API_URL', 'EVOLUTION_API_KEY ou WHATSAPP_API_KEY'],
    });
  }

  try {
    const instance = await getStoredInstance(token);
    const status = await buildUserStatus(instance);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar status' }, { status: 500 });
  }
}
