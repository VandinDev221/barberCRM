import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiTestEvent, verifyMetaPixelAccess } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

function getPixelId(): string | undefined {
  return (
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
    undefined
  );
}

/**
 * Envia um PageView de teste para a Conversions API (Graph API).
 *
 * Vercel env:
 * - NEXT_PUBLIC_META_PIXEL_ID (ou META_PIXEL_ID)
 * - META_CAPI_ACCESS_TOKEN — token em Gerenciador de Eventos → Pixel → Conversions API
 * - META_PIXEL_TEST_EVENT_CODE=TEST71427
 */
export async function GET(request: NextRequest) {
  const pixelId = getPixelId();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const testEventCode = process.env.META_PIXEL_TEST_EVENT_CODE?.trim();
  const checkOnly = request.nextUrl.searchParams.get('check') === '1';

  if (!pixelId || !accessToken) {
    return NextResponse.json(
      {
        error: 'Configure NEXT_PUBLIC_META_PIXEL_ID e META_CAPI_ACCESS_TOKEN na Vercel.',
        hint: 'O token deve ser gerado em: Gerenciador de Eventos → Pixel → Configurações → Conversions API → Gerar token de acesso.',
      },
      { status: 503 },
    );
  }

  const access = await verifyMetaPixelAccess(pixelId, accessToken);
  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
        hint: access.hint,
        pixel_id: pixelId,
        details: access.response,
        next_steps: [
          '1. Abra business.facebook.com/events_manager',
          '2. Selecione o pixel correto e confira o ID em Configurações',
          '3. Conversions API → Gerar token de acesso → copie para META_CAPI_ACCESS_TOKEN',
          '4. Redeploy na Vercel',
        ],
      },
      { status: 403 },
    );
  }

  if (checkOnly) {
    return NextResponse.json({
      ok: true,
      message: 'Token e pixel ID válidos.',
      pixel_id: pixelId,
      pixel_name: access.name,
    });
  }

  if (!testEventCode) {
    return NextResponse.json(
      {
        error: 'META_PIXEL_TEST_EVENT_CODE não configurado.',
        hint: 'Adicione TEST71427 (ou o código atual do Gerenciador de Eventos) na Vercel.',
        pixel_check: { ok: true, name: access.name },
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
      {
        error: result.error,
        hint: result.hint,
        details: result.response,
        test_event_code: testEventCode,
        pixel_id: pixelId,
        pixel_name: access.name,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Evento de teste enviado. Volte ao Gerenciador de Eventos > Testar eventos.',
    test_event_code: testEventCode,
    pixel_id: pixelId,
    pixel_name: access.name,
    response: result.response,
  });
}
