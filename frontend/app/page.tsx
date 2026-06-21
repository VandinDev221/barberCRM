'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { fetchPublicPlan, type PlanInfo } from '@/lib/plan';
import { postAuthRedirect } from '@/lib/subscription';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legal';
import {
  Calendar,
  MessageCircle,
  Users,
  BarChart3,
  Gift,
  Scissors,
} from 'lucide-react';

const FEATURES = [
  { icon: Calendar, title: 'Agenda inteligente', desc: 'Organize horários e confirme pelo WhatsApp.' },
  { icon: Users, title: 'CRM de clientes', desc: 'Histórico, VIP, fidelização e campanhas.' },
  { icon: MessageCircle, title: 'WhatsApp integrado', desc: 'QR Code self-service por barbeiro.' },
  { icon: BarChart3, title: 'Financeiro e relatórios', desc: 'Receita, estoque e exportação CSV.' },
  { icon: Gift, title: 'Aniversários automáticos', desc: 'Mensagens no dia certo, sem esforço.' },
  { icon: Scissors, title: 'Link de agendamento', desc: 'Seus clientes agendam online 24h.' },
];

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
        // Sem assinatura: permite ver a landing (ex.: link "Voltar ao site" em /billing)
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
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold">Barber CRM</span>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Gestão completa para barbeiro autônomo
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Agenda, clientes, WhatsApp, financeiro e agendamento online — tudo em um só lugar. Pare de
          perder clientes no caderno.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Criar conta grátis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
        {plan && (
          <p className="mt-6 text-sm text-muted-foreground">
            {plan.trialDays > 0 && (
              <span className="font-medium text-foreground">{plan.trialDays} dias grátis · </span>
            )}
            depois {plan.priceLabel}
          </p>
        )}
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold">Pronto para profissionalizar sua barbearia?</h2>
          <p className="mt-2 text-muted-foreground">
            {plan?.productName || 'Barber CRM Pro'} — {plan?.priceLabel || 'plano mensal'}
            {plan && plan.trialDays > 0 ? ` · ${plan.trialDays} dias de teste` : ''}
          </p>
          <Button className="mt-6" size="lg" asChild>
            <Link href="/register">Assinar e começar</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
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
