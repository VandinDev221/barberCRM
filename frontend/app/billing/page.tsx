'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { fetchPublicPlan, type PlanInfo } from '@/lib/plan';
import { isSubscriptionActive, postAuthRedirect } from '@/lib/subscription';
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  isActive: boolean;
};

export default function BillingPage() {
  const router = useRouter();
  const [canceled, setCanceled] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCanceled(new URLSearchParams(window.location.search).get('canceled') === '1');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    Promise.all([apiGet<BillingStatus>('/billing/status'), fetchPublicPlan()])
      .then(async ([data, planInfo]) => {
        setStatus(data);
        setPlan(planInfo);
        if (data.isActive) {
          const me = await apiGet<{ subscriptionStatus: string; onboardingCompleted: boolean }>(
            '/auth/me',
          );
          router.replace(postAuthRedirect(me));
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setError('');
    try {
      const { url } = await apiPost<{ url: string }>('/billing/checkout');
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar checkout');
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <Image
            src="/logo-barber-crm.png"
            alt="Barber CRM"
            width={320}
            height={96}
            className="h-auto w-full rounded-md border border-border/40"
            priority
          />
          <CardTitle>Assine o {plan?.productName || 'Barber CRM'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ative sua assinatura para acessar agenda, clientes, WhatsApp e relatórios.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{plan.priceLabel}</p>
              {plan.trialDays > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.trialDays} dias grátis · cancele quando quiser
                </p>
              )}
            </div>
          )}
          {canceled && (
            <p className="rounded-md bg-muted p-3 text-sm">
              Checkout cancelado. Você pode tentar novamente quando quiser.
            </p>
          )}
          {error && (
            <p className="rounded-md bg-destructive/20 p-2 text-sm text-destructive">{error}</p>
          )}
          {status && !isSubscriptionActive(status.subscriptionStatus) && (
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{status.subscriptionStatus}</span>
            </p>
          )}
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Agenda e agendamento online personalizado</li>
            <li>CRM de clientes e fidelização</li>
            <li>WhatsApp, campanhas e aniversários</li>
            <li>Financeiro, estoque e relatórios</li>
          </ul>
          <Button className="w-full" onClick={startCheckout} disabled={checkoutLoading}>
            {checkoutLoading
              ? 'Redirecionando...'
              : plan && plan.trialDays > 0
                ? `Começar ${plan.trialDays} dias grátis`
                : 'Assinar agora'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Pagamento seguro via Stripe. Sem dados de cartão armazenados em nossos servidores.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline hover:text-foreground">
              Sair e voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
