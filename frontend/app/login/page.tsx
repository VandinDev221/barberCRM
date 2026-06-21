'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { apiPost } from '@/lib/api';
import { AuthResponse, persistAuthSession } from '@/lib/auth-session';
import { postAuthRedirect } from '@/lib/subscription';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function redirectAfterAuth(res: AuthResponse) {
    router.replace(
      postAuthRedirect({
        subscriptionStatus: res.subscriptionStatus,
        onboardingCompleted: res.onboardingCompleted,
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<AuthResponse>('/auth/login', { email, password });
      persistAuthSession(res);
      redirectAfterAuth(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar';
      const isApiConfig =
        msg.includes('API não configurada') ||
        msg.includes('NEXT_PUBLIC_API_URL') ||
        msg.includes('DNS_HOSTNAME_RESOLVED_PRIVATE') ||
        (err instanceof TypeError && msg.includes('fetch'));
      setError(
        isApiConfig
          ? 'API não configurada. Na Vercel: Settings → Environment Variables → adicione NEXT_PUBLIC_API_URL = URL do backend (ex: https://seubackend). Depois faça Redeploy.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Image
            src="/logo-barber-crm.png"
            alt="Barber CRM"
            width={320}
            height={96}
            className="h-auto w-full rounded-md border border-border/40"
            priority
          />
          <CardTitle>Entrar</CardTitle>
          <p className="text-sm text-muted-foreground">Barber CRM</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/20 p-2 text-sm text-destructive">{error}</p>
          )}

          <GoogleSignInButton
            onSuccess={redirectAfterAuth}
            onError={setError}
            disabled={loading}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou e-mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/register" className="underline hover:text-foreground">
              Criar conta
            </Link>
            {' · '}
            <Link href="/" className="underline hover:text-foreground">
              Voltar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
