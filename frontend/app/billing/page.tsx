'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import {
  BarChart3,
  Calendar,
  Check,
  Gift,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { trackMetaPixel } from '@/lib/meta-pixel-events';
import { fetchPublicPlan, type PlanInfo } from '@/lib/plan';
import { postAuthRedirect } from '@/lib/subscription';

type BillingStatus = {
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  isActive: boolean;
};

const PLAN_FEATURES = [
  { icon: Calendar, text: 'Agenda inteligente e link de agendamento online' },
  { icon: Users, text: 'CRM de clientes, VIP e fidelização' },
  { icon: MessageCircle, text: 'WhatsApp, campanhas e aniversários automáticos' },
  { icon: BarChart3, text: 'Financeiro, estoque e relatórios exportáveis' },
  { icon: Gift, text: 'Confirmações e lembretes pelo WhatsApp' },
];

export default function BillingPage() {
  const router = useRouter();
  const [canceled, setCanceled] = useState(false);
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
      trackMetaPixel('InitiateCheckout');
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar checkout');
      setCheckoutLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.replace('/login');
  }

  const productName = plan?.productName || 'Barber CRM Pro';
  const ctaLabel =
    plan && plan.trialDays > 0
      ? `Iniciar ${plan.trialDays} dias grátis`
      : 'Assinar agora';

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-background to-primary/5 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparando sua assinatura...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo variant="header" priority />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Usar outra conta
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 text-center md:text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Último passo
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Ative o {productName}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Sua conta está pronta. Escolha o plano abaixo para liberar agenda, clientes, WhatsApp
            e relatórios — tudo em um só lugar.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Tudo incluído no plano</h2>
              <ul className="mt-5 space-y-4">
                {PLAN_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1 text-sm leading-relaxed text-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Pagamento seguro via Stripe
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-primary" />
                Dados de cartão não ficam conosco
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" />
                Cancele quando quiser
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="sticky top-6 overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
              <div className="bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground">
                Plano recomendado
              </div>
              <CardHeader className="pb-2 pt-6 text-center">
                <CardTitle className="text-xl">{productName}</CardTitle>
                {plan && (
                  <div className="mt-4">
                    <p className="text-4xl font-bold tracking-tight">{plan.priceLabel}</p>
                    {plan.trialDays > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.trialDays} dias grátis · sem cobrança imediata
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                {canceled && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    Checkout cancelado. Você pode tentar novamente quando quiser.
                  </p>
                )}
                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <ul className="space-y-2 border-y border-border py-4">
                  {['Acesso imediato após confirmação', 'Suporte por e-mail', 'Atualizações incluídas'].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>

                <Button
                  className="h-12 w-full text-base font-semibold"
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    ctaLabel
                  )}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Ao continuar, você será redirecionado ao checkout seguro do Stripe. A assinatura
                  renova automaticamente até o cancelamento.
                </p>
              </CardContent>
            </Card>

            <p className="mt-4 text-center text-sm text-muted-foreground lg:text-left">
              Dúvidas?{' '}
              <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
                Voltar ao site
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
