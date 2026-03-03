'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subDays, format } from 'date-fns';

type Payment = {
  id: string;
  amount: number | string;
  method: string;
  paidAt: string;
  client: { name: string };
};

type Paginated = {
  items: Payment[];
  total: number;
  totalAmount: number;
  page: number;
  totalPages: number;
};

const methodLabel: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
};

export default function FinanceiroPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', startDate, endDate, page],
    queryFn: () =>
      apiGet<Paginated>(
        `/payments?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=20`
      ),
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Financeiro</h1>

      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <CardTitle>Filtro por período</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
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

      {data && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-primary">
              Total no período: {formatCurrency(data.totalAmount)}
            </p>
            <p className="text-sm text-muted-foreground">{data.total} pagamento(s)</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.items?.length ? (
            <p className="text-muted-foreground">Nenhum pagamento no período.</p>
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Data</th>
                      <th className="pb-2 font-medium">Cliente</th>
                      <th className="pb-2 font-medium">Forma</th>
                      <th className="pb-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-3 text-muted-foreground">{formatDate(p.paidAt)}</td>
                        <td className="py-3">{p.client.name}</td>
                        <td className="py-3">{methodLabel[p.method] || p.method}</td>
                        <td className="py-3 font-medium">{formatCurrency(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalPages > 1 && (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
