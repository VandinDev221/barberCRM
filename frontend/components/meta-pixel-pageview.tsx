'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Dispara PageView no pixel a cada troca de rota (Next.js SPA). */
export function MetaPixelPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}
