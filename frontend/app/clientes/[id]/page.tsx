'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Pencil, Star } from 'lucide-react';

type ClientDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  isVip: boolean;
  lastVisitAt: string | null;
  totalSpent: number | string;
  visitCount: number;
  loyalty: { points: number; visitsCount: number } | null;
  appointments: {
    id: string;
    startAt: string;
    status: string;
    services: { service: { name: string }; price: number }[];
  }[];
};

export default function ClienteDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['client', id],
    queryFn: () => apiGet<ClientDetail>(`/clients/${id}`),
  });

  if (isLoading) return <div className="p-6">Carregando...</div>;
  if (error || !data) return <div className="p-6">Cliente não encontrado.</div>;

  return (
    <div className="p-4 sm:p-6">
      <BackButton href="/clientes" label="Voltar para Clientes" className="mb-4" />
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          {data.isVip && <Star className="h-6 w-6 fill-primary text-primary" />}
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/clientes/${id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Telefone:</span> {data.phone}
            </p>
            {data.email && (
              <p>
                <span className="text-muted-foreground">E-mail:</span> {data.email}
              </p>
            )}
            {data.birthDate && (
              <p>
                <span className="text-muted-foreground">Nascimento:</span>{' '}
                {new Date(data.birthDate).toLocaleDateString('pt-BR')}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Total gasto:</span>{' '}
              {formatCurrency(Number(data.totalSpent))}
            </p>
            <p>
              <span className="text-muted-foreground">Visitas:</span> {data.visitCount}
            </p>
            {data.loyalty && (
              <p>
                <span className="text-muted-foreground">Pontos fidelidade:</span>{' '}
                {data.loyalty.points}
              </p>
            )}
            {data.notes && (
              <p>
                <span className="text-muted-foreground">Observações:</span> {data.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.appointments?.length ? (
              <ul className="space-y-2 text-sm">
                {data.appointments.map((apt) => {
                  const total = apt.services.reduce((a, s) => a + Number(s.price), 0);
                  return (
                    <li key={apt.id} className="flex justify-between border-b pb-2">
                      <div>
                        <Link href={`/agenda?edit=${apt.id}`} className="hover:underline">
                          {formatDateTime(apt.startAt)}
                        </Link>
                        <span className="ml-2 text-muted-foreground">({apt.status})</span>
                      </div>
                      <span>{formatCurrency(total)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhum atendimento registrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
