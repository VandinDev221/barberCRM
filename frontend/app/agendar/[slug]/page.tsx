'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicBookingForm } from '@/components/public/booking-form';
import { apiGet } from '@/lib/api';

export default function AgendarSlugPage() {
  const params = useParams();
  const slug = String(params.slug || '');
  const [barberName, setBarberName] = useState<string>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiGet<{ name: string }>(`/public/${slug}/profile`)
      .then((p) => setBarberName(p.name))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-xl font-bold">Link não encontrado</h1>
        <p className="text-muted-foreground">Este link de agendamento não existe ou está inativo.</p>
        <Link href="/" className="text-primary underline">
          Voltar ao início
        </Link>
      </main>
    );
  }

  return <PublicBookingForm slug={slug} barberName={barberName} />;
}
