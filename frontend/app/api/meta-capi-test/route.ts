import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiTestEvent } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

/**
 * Envia um PageView de teste para a Conversions API (Graph API).
 * Use durante a validação no Gerenciador de Eventos da Meta.
 *
 * Vercel env:
 * - NEXT_PUBLIC_META_PIXEL_ID
 * - META_CAPI_ACCESS_TOKEN (token do pixel em Configurações > Conversions API)
 * - META_PIXEL_TEST_EVENT_CODE=TEST71427
 */
export async function GET(request: NextRequest) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const testEventCode = process.env.META_PIXEL_TEST_EVENT_CODE?.trim();

  if (!pixelId || !accessToken || !testEventCode) {
    return NextResponse.json(
      {
        error: 'Configure NEXT_PUBLIC_META_PIXEL_ID, META_CAPI_ACCESS_TOKEN e META_PIXEL_TEST_EVENT_CODE na Vercel.',
      },
      { status: 503 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'https://barber-painel.vercel.app';

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined;

  const result = await sendMetaCapiTestEvent({
    pixelId,
    accessToken,
    testEventCode,
    eventSourceUrl: `${siteUrl.replace(/\/$/, '')}/`,
    clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, details: result.response, test_event_code: testEventCode },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Evento de teste enviado. Volte ao Gerenciador de Eventos > Testar eventos.',
    test_event_code: testEventCode,
    pixel_id: pixelId,
    response: result.response,
  });
}
