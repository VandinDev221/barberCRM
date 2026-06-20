'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { postAuthRedirect } from '@/lib/subscription';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    apiGet<{ subscriptionStatus: string }>('/auth/me')
      .then((me) => router.replace(postAuthRedirect(me.subscriptionStatus)))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <h1 className="text-3xl font-bold text-foreground">Barber CRM</h1>
      <p className="text-muted-foreground">Gestão para barbeiro autônomo</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Entrar
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-input px-4 py-2 hover:bg-accent"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
