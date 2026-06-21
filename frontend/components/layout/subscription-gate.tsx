'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { postAuthRedirect } from '@/lib/subscription';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/clientes',
  '/agenda',
  '/servicos',
  '/financeiro',
  '/estoque',
  '/relatorios',
  '/fidelizacao',
  '/settings',
];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const needsGuard =
      pathname &&
      PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (!needsGuard) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    apiGet<{ subscriptionStatus: string; onboardingCompleted: boolean }>('/auth/me')
      .then((me) => {
        const target = postAuthRedirect(me);
        if (target !== '/dashboard' && !pathname.startsWith(target)) {
          router.replace(target);
        }
      })
      .catch(() => router.replace('/login'));
  }, [pathname, router]);

  return <>{children}</>;
}
