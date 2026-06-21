'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type DashboardData = {
  todayRevenue: number;
  todayAppointments: number;
  monthRevenue: number;
  nextAppointment: {
    id: string;
    startAt: string;
    client: { name: string; phone: string };
    services: { service: { name: string }; price: number }[];
  } | null;
  inactiveClientsCount: number;
  revenueSeries: { date: string; value: number }[];
};

export default function DashboardPage() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardData>('/dashboard'),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">Erro ao carregar o dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        {isFetching && !isLoading && (
          <span className="text-[10px] text-muted-foreground/70">atualizando…</span>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturamento hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.todayRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.todayAppointments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total do mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.monthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inativos 30 dias</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.inactiveClientsCount}</p>
            <Link href="/relatorios?tab=inativos" className="text-xs text-primary hover:underline">
              Ver lista
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximo atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            {data.nextAppointment ? (
              <div className="space-y-2">
                <p className="font-medium">{data.nextAppointment.client.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(data.nextAppointment.startAt)}
                </p>
                <p className="text-sm">
                  {data.nextAppointment.services.map((s) => s.service.name).join(', ')} —{' '}
                  {formatCurrency(
                    data.nextAppointment.services.reduce((a, s) => a + Number(s.price), 0)
                  )}
                </p>
                <Link
                  href={`/agenda?edit=${data.nextAppointment.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver na agenda
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum agendamento próximo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita (últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.revenueSeries.slice(-7).map((d) => (
                <div key={d.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.date}</span>
                  <span className="font-medium">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
