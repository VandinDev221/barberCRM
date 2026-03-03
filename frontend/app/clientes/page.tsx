'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, Star } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastVisitAt: string | null;
  totalSpent: number | string;
  visitCount: number;
  isVip: boolean;
};

type Paginated = { items: Client[]; total: number; page: number; totalPages: number };

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () =>
      apiGet<Paginated>(`/clients?page=${page}&limit=20&search=${encodeURIComponent(search)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Clientes</h1>
        <Button asChild className="w-full sm:w-auto">
          <a href="/clientes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo cliente
          </a>
        </Button>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.items?.length ? (
            <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="hidden pb-2 font-medium sm:table-cell">Telefone</th>
                    <th className="hidden pb-2 font-medium md:table-cell">Última visita</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="hidden pb-2 font-medium md:table-cell">Visitas</th>
                    <th className="w-20 pb-2 font-medium sm:w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {c.isVip && <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />}
                          <a href={`/clientes/${c.id}`} className="font-medium hover:underline">
                            {c.name}
                          </a>
                        </div>
                      </td>
                      <td className="hidden py-3 text-muted-foreground sm:table-cell">{c.phone}</td>
                      <td className="hidden py-3 text-muted-foreground md:table-cell">
                        {c.lastVisitAt ? formatDate(c.lastVisitAt) : '-'}
                      </td>
                      <td className="py-3">{formatCurrency(Number(c.totalSpent))}</td>
                      <td className="hidden py-3 md:table-cell">{c.visitCount}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/clientes/${c.id}/editar`}>
                              <Pencil className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Remover este cliente?')) deleteMutation.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
