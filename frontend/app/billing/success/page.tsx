'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';

type BillingStatus = { isActive: boolean; subscriptionStatus: string };

export default function BillingSuccessPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirmando pagamento...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      try {
        const data = await apiGet<BillingStatus>('/billing/status');
        if (data.isActive) {
          setMessage('Assinatura ativa! Redirecionando...');
          setReady(true);
          setTimeout(() => router.replace('/dashboard'), 1500);
          return;
        }
      } catch {
        /* webhook pode demorar */
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        setMessage(
          'Pagamento recebido. Se o acesso não liberar em instantes, aguarde alguns segundos e clique abaixo.',
        );
        setReady(true);
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Pagamento confirmado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {ready && (
            <Button className="w-full" onClick={() => router.replace('/dashboard')}>
              Ir para o dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
