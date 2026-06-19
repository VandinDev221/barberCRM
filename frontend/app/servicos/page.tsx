'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  price: number | string;
  duration: number;
  category: string | null;
  isActive: boolean;
};

export default function ServicosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<Service[]>('/services'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; price: number; duration: number; category?: string }) =>
      apiPost('/services', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Service> }) =>
      apiPatch(`/services/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  function resetForm() {
    setName('');
    setPrice('');
    setDuration('');
    setCategory('');
  }

  function openEdit(s: Service) {
    setEditing(s);
    setName(s.name);
    setPrice(String(s.price));
    setDuration(String(s.duration));
    setCategory(s.category || '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    const d = parseInt(duration, 10);
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: { name, price: p, duration: d, category: category || undefined },
      });
    } else {
      createMutation.mutate({ name, price: p, duration: d, category: category || undefined });
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Serviços</h1>
        <Button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo serviço
        </Button>
      </div>

      {(showForm || editing) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? 'Editar serviço' : 'Novo serviço'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Salvar' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de serviços</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !services?.length ? (
            <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Preço</th>
                    <th className="pb-2 font-medium">Duração</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-3">{s.name}</td>
                      <td className="py-3">{formatCurrency(Number(s.price))}</td>
                      <td className="py-3">{s.duration} min</td>
                      <td className="py-3 text-muted-foreground">{s.category || '-'}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Remover este serviço?')) deleteMutation.mutate(s.id);
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
        </CardContent>
      </Card>
    </div>
  );
}
