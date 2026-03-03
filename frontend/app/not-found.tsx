'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 sm:p-6">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <p className="text-center text-sm text-muted-foreground">
        A URL <strong>/api/auth/login</strong> é do backend. Use a página de login do sistema.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Início
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-input px-4 py-2 hover:bg-accent"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
