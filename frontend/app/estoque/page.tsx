'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, AlertTriangle } from 'lucide-react';

type Item = {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

type Response = { items: Item[]; lowStock: Item[] };

export default function EstoquePage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiGet<Response>('/inventory'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; quantity: number; minQuantity: number }) =>
      apiPost('/inventory', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowForm(false);
      setName('');
      setQuantity(0);
      setMinQuantity(0);
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      apiPatch(`/inventory/${id}/adjust`, { delta }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/inventory/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name, quantity, minQuantity });
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Estoque</h1>
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo item
        </Button>
      </div>

      {data?.lowStock?.length ? (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Itens em alerta (estoque mínimo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {data.lowStock.map((i) => (
                <li key={i.id}>
                  {i.name}: {i.quantity} {i.unit} (mínimo: {i.minQuantity})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cadastrar item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estoque mínimo (alerta)</Label>
                <Input
                  type="number"
                  min={0}
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  Salvar
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.items?.length ? (
            <p className="text-muted-foreground">Nenhum item no estoque.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Quantidade</th>
                    <th className="pb-2 font-medium">Mínimo</th>
                    <th className="pb-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="py-3">{i.name}</td>
                      <td className="py-3">
                        {i.quantity} {i.unit}
                      </td>
                      <td className="py-3">{i.minQuantity}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustMutation.mutate({ id: i.id, delta: -1 })}
                          >
                            -
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustMutation.mutate({ id: i.id, delta: 1 })}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Remover item?')) deleteMutation.mutate(i.id);
                            }}
                          >
                            Excluir
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
