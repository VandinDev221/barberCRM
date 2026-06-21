import Link from 'next/link';

export default function AgendarLegacyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-bold">Link de agendamento pessoal</h1>
      <p className="max-w-md text-muted-foreground">
        Cada barbeiro tem um link exclusivo no formato{' '}
        <code className="rounded bg-muted px-1">/agendar/seu-slug</code>. Peça o link completo ao
        profissional ou crie sua conta no Barber CRM.
      </p>
      <Link href="/" className="text-primary underline">
        Conhecer o Barber CRM
      </Link>
    </main>
  );
}
