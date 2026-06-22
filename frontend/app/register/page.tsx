'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { apiPost } from '@/lib/api';
import { AuthResponse, persistAuthSession } from '@/lib/auth-session';
import { trackMetaPixel } from '@/lib/meta-pixel-events';
import { postAuthRedirect } from '@/lib/subscription';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legal';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    if (!acceptTerms) {
      setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<AuthResponse>('/auth/register', {
        name,
        email,
        phone: phone || undefined,
        password,
        acceptTerms: true,
      });
      persistAuthSession(res);
      trackMetaPixel('CompleteRegistration');
      redirectAfterAuth(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandLogo variant="auth" priority />
          <CardTitle>Criar conta</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre-se e assine para liberar o acesso à plataforma.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/20 p-2 text-sm text-destructive">{error}</p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              Li e aceito os{' '}
              <a href={TERMS_URL} className="underline" target="_blank" rel="noopener noreferrer">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href={PRIVACY_URL} className="underline" target="_blank" rel="noopener noreferrer">
                Política de Privacidade
              </a>
              .
            </span>
          </label>

          {acceptTerms ? (
            <GoogleSignInButton
              acceptTerms
              onSuccess={(res) => {
                trackMetaPixel('CompleteRegistration');
                redirectAfterAuth(res);
              }}
              onError={setError}
              disabled={loading}
            />
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Aceite os termos acima para usar o Google.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !acceptTerms}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="underline hover:text-foreground">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
