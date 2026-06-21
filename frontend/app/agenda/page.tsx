'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { addDays, startOfWeek, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  fromPublicLink?: boolean;
  notes?: string | null;
  client: { name: string; phone: string };
  services: { service: { name: string }; price: number }[];
};

function isPendingPublicConfirmation(apt: Appointment): boolean {
  const fromPublic = apt.fromPublicLink || (apt.notes != null && apt.notes.includes('link público'));
  return fromPublic && apt.status === 'scheduled';
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [confirmFeedback, setConfirmFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endDate = addDays(weekStart, 6);
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', startStr, endStr],
    queryFn: () => apiGet<{ items: Appointment[] }>(`/appointments?startDate=${startStr}&endDate=${endStr}`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/appointments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const confirmAppointment = useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ whatsapp?: { sent: boolean; error?: string } }>(`/appointments/${id}/confirm`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (data.whatsapp?.sent) {
        setConfirmFeedback('Agendamento confirmado e cliente avisado no WhatsApp.');
      } else if (data.whatsapp && !data.whatsapp.sent) {
        setConfirmFeedback(
          `Confirmado, mas o WhatsApp não foi enviado: ${data.whatsapp.error ?? 'verifique a conexão em Configurações'}.`,
        );
      } else {
        setConfirmFeedback('Agendamento confirmado.');
      }
      setTimeout(() => setConfirmFeedback(null), 8000);
    },
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const itemsByDay: Record<string, Appointment[]> = {};
  days.forEach((d) => (itemsByDay[format(d, 'yyyy-MM-dd')] = []));
  data?.items?.forEach((apt) => {
    const day = format(new Date(apt.startAt), 'yyyy-MM-dd');
    if (itemsByDay[day]) itemsByDay[day].push(apt);
  });

  const pendingConfirmation = (data?.items ?? []).filter(isPendingPublicConfirmation);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Agenda</h1>
        <Button asChild className="w-full sm:w-auto">
          <a href="/agenda/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo agendamento
          </a>
        </Button>
      </div>

      {confirmFeedback && (
        <Card className="mb-4 border-primary/40 bg-primary/5">
          <CardContent className="pt-4 text-sm">{confirmFeedback}</CardContent>
        </Card>
      )}

      {pendingConfirmation.length > 0 && (
        <Card className="mb-4 border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-4">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {pendingConfirmation.length} agendamento(s) pelo link público aguardando sua confirmação.
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Procure os cards em destaque amarelo na semana abaixo e clique em <strong>Confirmar e notificar WhatsApp</strong> para confirmar e avisar o cliente.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="flex items-center justify-between gap-2 pt-4 sm:pt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-center text-sm font-medium sm:text-base">
            {format(weekStart, 'd MMM', { locale: ptBR })} –{' '}
            {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
        {days.map((day) => (
          <Card key={day.toISOString()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {format(day, 'EEE', { locale: ptBR })}
                <br />
                {format(day, 'd')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : (itemsByDay[format(day, 'yyyy-MM-dd')] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem agendamentos</p>
              ) : (
                (itemsByDay[format(day, 'yyyy-MM-dd')] || []).map((apt) => {
                  const total = apt.services.reduce((a, s) => a + Number(s.price), 0);
                  return (
                    <div
                      key={apt.id}
                      className={`rounded border p-2 text-xs ${
                        apt.status === 'cancelled'
                          ? 'border-muted bg-muted/50 opacity-60'
                          : apt.status === 'completed'
                          ? 'border-green-500/50 bg-green-500/10'
                          : isPendingPublicConfirmation(apt)
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-border'
                      }`}
                    >
                      <p className="font-medium">{apt.client.name}</p>
                      {isPendingPublicConfirmation(apt) && (
                        <p className="text-amber-700 dark:text-amber-400 text-[10px] font-medium">Aguardando confirmação</p>
                      )}
                      <p className="text-muted-foreground">
                        {format(new Date(apt.startAt), 'HH:mm')} – {formatCurrency(total)}
                      </p>
                      {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {isPendingPublicConfirmation(apt) ? (
                            <Button
                              size="sm"
                              className="h-8 w-full text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => confirmAppointment.mutate(apt.id)}
                              disabled={confirmAppointment.isPending}
                            >
                              {confirmAppointment.isPending ? '...' : 'Confirmar e notificar WhatsApp'}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            className="h-8 w-full text-xs"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: 'completed' })}
                          >
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: 'cancelled' })}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
