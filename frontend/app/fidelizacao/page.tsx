'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RankingItem = {
  rank: number;
  clientId: string;
  name: string;
  visitCount: number;
  totalSpent: number;
  points: number;
};

type Settings = {
  pointsPerVisit: number;
  visitGoal: number;
  discountPercent: number;
};

export default function FidelizacaoPage() {
  const queryClient = useQueryClient();
  const [pointsPerVisit, setPointsPerVisit] = useState(10);
  const [visitGoal, setVisitGoal] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(10);

  const { data: ranking } = useQuery({
    queryKey: ['loyalty-ranking'],
    queryFn: () => apiGet<RankingItem[]>('/loyalty/ranking?limit=20'),
  });

  const { data: settings } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: () => apiGet<Settings>('/loyalty/settings'),
  });

  const updateSettings = useMutation({
    mutationFn: (body: Partial<Settings>) => apiPatch('/loyalty/settings', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] }),
  });

  const handleSaveSettings = () => {
    updateSettings.mutate({
      pointsPerVisit,
      visitGoal,
      discountPercent,
    });
  };

  useEffect(() => {
    if (settings) {
      setPointsPerVisit(settings.pointsPerVisit);
      setVisitGoal(settings.visitGoal);
      setDiscountPercent(settings.discountPercent);
    }
  }, [settings]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Fidelização</h1>

      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pontos por visita, meta de visitas para desconto e percentual de desconto
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Pontos por visita</Label>
              <Input
                type="number"
                min={0}
                value={pointsPerVisit}
                onChange={(e) => setPointsPerVisit(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta de visitas (ex: a cada 10 cortes)</Label>
              <Input
                type="number"
                min={1}
                value={visitGoal}
                onChange={(e) => setVisitGoal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto (%) ao atingir meta</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de clientes</CardTitle>
          <p className="text-sm text-muted-foreground">Por número de visitas</p>
        </CardHeader>
        <CardContent>
          {ranking?.length ? (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[260px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Visitas</th>
                    <th className="pb-2 font-medium">Total gasto</th>
                    <th className="pb-2 font-medium">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.clientId} className="border-b">
                      <td className="py-3 font-medium">{r.rank}</td>
                      <td className="py-3">
                        <a href={`/clientes/${r.clientId}`} className="hover:underline">
                          {r.name}
                        </a>
                      </td>
                      <td className="py-3">{r.visitCount}</td>
                      <td className="py-3">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.totalSpent)}
                      </td>
                      <td className="py-3">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum dado de fidelização ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
