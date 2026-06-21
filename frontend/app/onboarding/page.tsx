'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { bookingUrl } from '@/lib/plan';
import { isSubscriptionActive, postAuthRedirect } from '@/lib/subscription';
import { CheckCircle2, Copy, Link2, Scissors } from 'lucide-react';

type Me = {
  name: string;
  slug: string;
  subscriptionStatus: string;
  onboardingCompleted: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    apiGet<Me>('/auth/me')
      .then((data) => {
        if (!isSubscriptionActive(data.subscriptionStatus)) {
          router.replace('/billing');
          return;
        }
        if (data.onboardingCompleted) {
          router.replace('/dashboard');
          return;
        }
        setMe(data);
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function copyLink() {
    if (!me?.slug) return;
    await navigator.clipboard.writeText(bookingUrl(me.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function finish() {
    setFinishing(true);
    try {
      await apiPost('/auth/onboarding/complete');
      router.replace('/dashboard');
    } finally {
      setFinishing(false);
    }
  }

  if (loading || !me) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Preparando sua conta...</p>
      </main>
    );
  }

  const link = bookingUrl(me.slug);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Bem-vindo, {me.name}!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sua conta está pronta. Compartilhe seu link de agendamento e comece a usar o CRM.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border border-border/60 bg-muted/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              Seu link de agendamento
            </p>
            <code className="block break-all text-sm">{link}</code>
            <Button variant="outline" size="sm" className="mt-3" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? 'Copiado!' : 'Copiar link'}
            </Button>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Scissors className="h-4 w-4" />
              Serviços criados para você
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {['Corte de Cabelo', 'Barba', 'Corte + Barba'].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Edite preços e duração em{' '}
              <Link href="/servicos" className="underline">
                Serviços
              </Link>
              .
            </p>
          </div>

          <Button className="w-full" onClick={finish} disabled={finishing}>
            {finishing ? 'Salvando...' : 'Ir para o dashboard'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
