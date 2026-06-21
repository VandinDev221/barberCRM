'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { fetchPublicPlan, type PlanInfo } from '@/lib/plan';
import { postAuthRedirect } from '@/lib/subscription';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legal';
import { formatSupportPhoneDisplay, supportWhatsAppUrl } from '@/lib/contact';
import {
  LandingFaq,
  LandingFinalCta,
  LandingHero,
  LandingHowItWorks,
  LandingIncluded,
  LandingPreviewSection,
  LandingPricing,
} from '@/components/landing/landing-sections';
import { MessageCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [pendingBilling, setPendingBilling] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    apiGet<{ subscriptionStatus: string; onboardingCompleted: boolean }>('/auth/me')
      .then((me) => {
        const target = postAuthRedirect(me);
        if (target === '/billing') {
          setPendingBilling(true);
          return;
        }
        router.replace(target);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    fetchPublicPlan().then(setPlan).catch(() => null);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {pendingBilling && (
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-3 text-center text-sm">
          <span className="text-muted-foreground">Sua conta está aguardando assinatura. </span>
          <Link href="/billing" className="font-medium text-primary underline-offset-4 hover:underline">
            Continuar pagamento
          </Link>
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
          <Link href="/" className="flex items-center">
            <BrandLogo variant="header" priority />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="sm:size-default" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" className="sm:size-default" asChild>
              <Link href="/register">Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      <LandingHero plan={plan} />
      <LandingPreviewSection />
      <LandingHowItWorks />
      <LandingIncluded />
      <LandingPricing plan={plan} />
      <LandingFaq />
      <LandingFinalCta plan={plan} />

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <p className="mb-4">
          Dúvidas?{' '}
          <a
            href={supportWhatsAppUrl('Olá! Tenho dúvidas sobre o Barber CRM.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            <MessageCircle className="h-4 w-4" />
            Chama no WhatsApp: {formatSupportPhoneDisplay()}
          </a>
        </p>
        <div className="flex justify-center gap-4">
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Termos de Uso
          </a>
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Privacidade
          </a>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Barber CRM</p>
      </footer>
    </main>
  );
}
