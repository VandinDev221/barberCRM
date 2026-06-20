'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  phone: string;
};

type Paginated = { items: Client[]; total: number; page: number; totalPages: number };

export default function CampanhasPage() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients-campaign', search],
    queryFn: () =>
      apiGet<Paginated>(`/clients?page=1&limit=500&search=${encodeURIComponent(search)}`),
  });

  const sendMutation = useMutation({
    mutationFn: async (body: { clientIds: string[]; message: string }) => {
      return apiPost<{ sent: number; failed: number; total: number; errors?: string[] }>(
        '/settings/campaign',
        body,
      );
    },
  });

  const clients = data?.items ?? [];
  const allSelected = clients.length > 0 && clients.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map((c) => c.id)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0 || !message.trim()) return;
    const clientIds = Array.from(selectedIds);
    sendMutation.mutate(
      { clientIds, message: message.trim() },
      {
        onSuccess: () => {
          setMessage('');
          setSelectedIds(new Set());
        },
      }
    );
  }

  const result = sendMutation.data;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Configurações
        </Link>
      </div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold sm:mb-6 sm:text-2xl">
        <Megaphone className="h-6 w-6" />
        Campanhas
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Selecione os clientes que receberão a mensagem e escreva o texto. Antes de enviar, conecte
        seu WhatsApp em{' '}
        <Link href="/settings/whatsapp" className="text-primary hover:underline">
          Configurações → WhatsApp
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mensagem</CardTitle>
            <p className="text-sm text-muted-foreground">
              Esta mensagem será enviada para cada cliente selecionado.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Digite a mensagem da campanha..."
              required
              disabled={sendMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecionar clientes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Busque e marque os contatos que receberão a mensagem (máx. 500 na lista).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={clients.length > 0 && allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input"
                />
                Selecionar todos ({clients.length})
              </label>
              {someSelected && (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selecionado(s)
                </span>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando clientes...</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto rounded-md border border-input p-3">
                <ul className="space-y-2">
                  {clients.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted-foreground">{c.phone}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {sendMutation.isError && (
          <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {sendMutation.error instanceof Error ? sendMutation.error.message : 'Erro ao enviar.'}
          </p>
        )}
        {result && (
          <div className="space-y-2">
            <p className="rounded-md bg-green-500/15 p-3 text-sm text-green-800 dark:text-green-200">
              Enviado: {result.sent} | Falha: {result.failed} | Total: {result.total}
            </p>
            {result.errors && result.errors.length > 0 && (
              <pre className="overflow-x-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {result.errors.join('\n')}
              </pre>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={selectedIds.size === 0 || !message.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            `Enviar para ${selectedIds.size} cliente(s)`
          )}
        </Button>
      </form>
    </div>
  );
}
