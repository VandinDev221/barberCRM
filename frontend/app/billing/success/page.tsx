'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/api';
import { trackMetaPixel } from '@/lib/meta-pixel-events';
import { postAuthRedirect } from '@/lib/subscription';

type BillingStatus = { isActive: boolean; subscriptionStatus: string };
type Me = { subscriptionStatus: string; onboardingCompleted: boolean };

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('session_id');
}

async function syncCheckoutSession(): Promise<BillingStatus | null> {
  const sessionId = getSessionId();
  if (sessionId) {
    try {
      return await apiPost<BillingStatus>('/billing/confirm', { sessionId });
    } catch {
      /* tenta sync pelo cliente Stripe */
    }
  }
  try {
    return await apiPost<BillingStatus>('/billing/sync');
  } catch {
    return null;
  }
}

export default function BillingSuccessPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirmando pagamento...');
  const [ready, setReady] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const subscribedTracked = useRef(false);

  async function finishIfActive(): Promise<boolean> {
    const data = await apiGet<BillingStatus>('/billing/status');
    if (!data.isActive) return false;

    if (!subscribedTracked.current) {
      subscribedTracked.current = true;
      trackMetaPixel('Subscribe', { value: 0, currency: 'BRL' });
    }
    const me = await apiGet<Me>('/auth/me');
    setMessage('Assinatura ativa! Redirecionando...');
    setReady(true);
    setTimeout(() => router.replace(postAuthRedirect(me)), 1500);
    return true;
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        if (attempts === 0) {
          const synced = await syncCheckoutSession();
          if (synced?.isActive) {
            await finishIfActive();
            return;
          }
        }

        if (await finishIfActive()) return;
      } catch {
        /* webhook ou sync podem demorar */
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        setMessage(
          'Pagamento recebido. Se o acesso não liberar em instantes, clique em Continuar para tentar novamente.',
        );
        setReady(true);
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleContinue() {
    setContinuing(true);
    setMessage('Verificando assinatura...');
    try {
      await syncCheckoutSession();
      if (await finishIfActive()) return;

      setMessage(
        'Acesso ainda não liberado. Aguarde alguns minutos e tente novamente, ou fale com o suporte.',
      );
      setReady(true);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro ao confirmar assinatura.');
      setReady(true);
    } finally {
      setContinuing(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Pagamento confirmado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {ready && (
            <Button className="w-full" disabled={continuing} onClick={handleContinue}>
              {continuing ? 'Verificando...' : 'Continuar'}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
