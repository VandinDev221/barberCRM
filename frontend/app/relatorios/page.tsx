'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subDays, format } from 'date-fns';

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: revenue } = useQuery({
    queryKey: ['reports-revenue', startDate, endDate],
    queryFn: () =>
      apiGet<{ series: { date: string; value: number }[]; total: number }>(
        `/reports/revenue?startDate=${startDate}&endDate=${endDate}`
      ),
  });

  const { data: topServices } = useQuery({
    queryKey: ['reports-top-services', startDate, endDate],
    queryFn: () =>
      apiGet<{ name: string; count: number; revenue: number }[]>(
        `/reports/top-services?startDate=${startDate}&endDate=${endDate}`
      ),
  });

  const { data: inactive } = useQuery({
    queryKey: ['reports-inactive'],
    queryFn: () =>
      apiGet<{ id: string; name: string; phone: string; lastVisitAt: string | null }[]>(
        '/reports/inactive-clients?days=30'
      ),
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Relatórios</h1>

      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <CardTitle>Período</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">De</label>
            <input
              type="date"
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Até</label>
            <input
              type="date"
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por dia</CardTitle>
            {revenue && (
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(revenue.total)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {revenue?.series?.length ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {revenue.series.map((d) => (
                  <div key={d.date} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{d.date}</span>
                    <span className="font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados no período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices?.length ? (
              <div className="space-y-2">
                {topServices.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span>
                      {s.count} atend. – {formatCurrency(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Clientes inativos (30 dias)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Última visita há mais de 30 dias ou nunca visitaram
          </p>
        </CardHeader>
        <CardContent>
          {inactive?.length ? (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Telefone</th>
                    <th className="pb-2 font-medium">Última visita</th>
                  </tr>
                </thead>
                <tbody>
                  {inactive.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3">
                        <a href={`/clientes/${c.id}`} className="hover:underline">
                          {c.name}
                        </a>
                      </td>
                      <td className="py-3 text-muted-foreground">{c.phone}</td>
                      <td className="py-3 text-muted-foreground">
                        {c.lastVisitAt ? formatDate(c.lastVisitAt) : 'Nunca'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum cliente inativo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
