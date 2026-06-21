import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Check,
  Gift,
  Link2,
  MessageCircle,
  QrCode,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanInfo } from '@/lib/plan';
import { LandingProductPreview } from './product-preview';

const PAIN_BULLETS = [
  'Pare de perder horário no WhatsApp',
  'Cliente agenda sozinho, 24 horas por dia',
  'Confirmação automática — você só aprova na agenda',
];

const HOW_IT_WORKS = [
  {
    step: '1',
    icon: QrCode,
    title: 'Conecte seu WhatsApp',
    desc: 'Escaneie o QR Code nas configurações. Leva menos de 2 minutos.',
  },
  {
    step: '2',
    icon: Link2,
    title: 'Compartilhe seu link',
    desc: 'Cada barbeiro tem um link personalizado tipo /agendar/sua-barbearia.',
  },
  {
    step: '3',
    icon: Calendar,
    title: 'Cliente agenda online',
    desc: 'Ele escolhe data, horário e serviço. Você recebe aviso no WhatsApp na hora.',
  },
  {
    step: '4',
    icon: MessageCircle,
    title: 'Confirme e pronto',
    desc: 'Um clique na agenda confirma e o cliente recebe a mensagem automaticamente.',
  },
];

const INCLUDED = [
  {
    icon: Calendar,
    title: 'Agenda semanal',
    desc: 'Visualize a semana, confirme, conclua ou cancele com notificação no WhatsApp.',
  },
  {
    icon: Link2,
    title: 'Link de agendamento 24h',
    desc: 'Página pública com horários livres atualizados em tempo real.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    desc: 'Confirmações, cancelamentos, campanhas e aniversários automáticos.',
  },
  {
    icon: Users,
    title: 'CRM de clientes',
    desc: 'Histórico, VIP, fidelização e busca por nome ou telefone.',
  },
  {
    icon: BarChart3,
    title: 'Financeiro e relatórios',
    desc: 'Faturamento do dia e do mês, exportação CSV e controle de estoque.',
  },
  {
    icon: Gift,
    title: 'Campanhas com IA',
    desc: 'Sugestões de mensagem para promoções e reativação de clientes.',
  },
];

const FAQ = [
  {
    q: 'Preciso de computador?',
    a: 'Não. O Barber CRM funciona no navegador do celular — agenda, clientes e WhatsApp pelo smartphone.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim, 100%. A interface foi pensada para uso no dia a dia da barbearia, direto no celular.',
  },
  {
    q: 'Preciso de WhatsApp Business?',
    a: 'Não. Você conecta seu WhatsApp normal escaneando um QR Code, como no WhatsApp Web.',
  },
  {
    q: 'Como funciona o período grátis?',
    a: 'Você testa todas as funções sem cobrança imediata. Só paga depois do trial, se continuar usando.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. A assinatura é mensal e você cancela pelo portal seguro do Stripe, sem burocracia.',
  },
];

export function planHighlight(plan: PlanInfo | null): string {
  if (!plan?.priceLabel || plan.priceLabel === 'Consulte') {
    return plan?.trialDays ? `${plan.trialDays} dias grátis` : 'Plano mensal';
  }
  if (plan.trialDays > 0) {
    return `${plan.priceLabel} · ${plan.trialDays} dias grátis`;
  }
  return plan.priceLabel;
}

export function LandingHero({ plan }: { plan: PlanInfo | null }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 pt-12 text-center sm:pt-16">
      {plan && (
        <p className="mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          {planHighlight(plan)}
        </p>
      )}
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
        Gestão completa para o barbeiro autônomo
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
        Agenda, clientes, WhatsApp e link de agendamento online — tudo conectado. Menos mensagem
        perdida, mais corte feito.
      </p>
      <ul className="mx-auto mt-8 flex max-w-lg flex-col gap-3 text-left sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2">
        {PAIN_BULLETS.map((text) => (
          <li key={text} className="flex items-center gap-2 text-sm font-medium sm:text-base">
            <Check className="h-5 w-5 shrink-0 text-primary" />
            {text}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Button size="lg" asChild>
          <Link href="/register">
            {plan && plan.trialDays > 0 ? `Começar ${plan.trialDays} dias grátis` : 'Criar conta'}
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">Já tenho conta</Link>
        </Button>
      </div>
    </section>
  );
}

export function LandingPreviewSection() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Veja como funciona por dentro</h2>
          <p className="mt-2 text-muted-foreground">
            Agenda, dashboard e WhatsApp na mesma tela — simples de usar no celular.
          </p>
        </div>
        <LandingProductPreview />
      </div>
    </section>
  );
}

export function LandingHowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Como funciona</h2>
        <p className="mt-2 text-muted-foreground">Do cadastro ao primeiro cliente agendado em minutos.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
          <div key={step} className="relative rounded-xl border border-border/60 bg-card p-5">
            <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {step}
            </span>
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingIncluded() {
  return (
    <section className="border-t border-border/60 bg-muted/20 py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Tudo que você ganha</h2>
          <p className="mt-2 text-muted-foreground">Um plano, sem módulos escondidos ou taxa extra.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
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
        </div>
      </div>
    </section>
  );
}

export function LandingPricing({ plan }: { plan: PlanInfo | null }) {
  const productName = plan?.productName || 'Barber CRM Pro';
  const cta =
    plan && plan.trialDays > 0 ? `Iniciar ${plan.trialDays} dias grátis` : 'Assinar e começar';

  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-md">
        <Card className="overflow-hidden border-primary/25 shadow-lg shadow-primary/5">
          <div className="bg-primary px-6 py-2.5 text-center text-sm font-medium text-primary-foreground">
            Plano único — tudo incluso
          </div>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{productName}</CardTitle>
            {plan?.priceLabel && plan.priceLabel !== 'Consulte' ? (
              <p className="mt-2 text-4xl font-bold tracking-tight">{plan.priceLabel}</p>
            ) : (
              <p className="mt-2 text-2xl font-bold">Consulte valores</p>
            )}
            {plan && plan.trialDays > 0 && (
              <p className="text-sm font-medium text-primary">
                {plan.trialDays} dias grátis · sem cobrança imediata
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'Agenda + link de agendamento 24h',
                'WhatsApp: confirmações e campanhas',
                'CRM, financeiro e relatórios',
                'Cancele quando quiser',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg" asChild>
              <Link href="/register">{cta}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function LandingFaq() {
  return (
    <section className="border-t border-border/60 bg-muted/20 py-14 sm:py-16">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">Perguntas frequentes</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-lg border border-border/60 bg-card px-4 py-3 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFinalCta({ plan }: { plan: PlanInfo | null }) {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Pronto para profissionalizar sua barbearia?</h2>
        <p className="mt-3 text-muted-foreground">
          {plan ? planHighlight(plan) : 'Comece hoje'} — configure em minutos e compartilhe seu link.
        </p>
        <Button className="mt-8" size="lg" asChild>
          <Link href="/register">
            {plan && plan.trialDays > 0 ? `Começar ${plan.trialDays} dias grátis` : 'Criar minha conta'}
          </Link>
        </Button>
      </div>
    </section>
  );
}
