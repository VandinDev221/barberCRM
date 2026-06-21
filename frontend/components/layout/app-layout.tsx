'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { SubscriptionGate } from './subscription-gate';

const SIDEBAR_PATHS = [
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = pathname && SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <SubscriptionGate>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="min-h-screen pt-14 pl-0 md:pt-0 md:pl-56">{children}</main>
      </div>
    </SubscriptionGate>
  );
}
