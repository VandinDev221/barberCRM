'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { format, addMinutes } from 'date-fns';

type Client = { id: string; name: string; phone: string };
type Service = { id: string; name: string; price: number; duration: number };

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => apiGet<{ items: Client[] }>('/clients?limit=500'),
  });
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<Service[]>('/services?activeOnly=true'),
  });

  const selectedServices = (services || []).filter((s) => serviceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((a, s) => a + s.duration, 0);
  const totalPrice = selectedServices.reduce((a, s) => a + Number(s.price), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || selectedServices.length === 0) {
      setError('Selecione o cliente e ao menos um serviço.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const startAt = new Date(`${date}T${time}`);
      const endAt = addMinutes(startAt, totalDuration);
      await apiPost('/appointments', {
        clientId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        serviceItems: selectedServices.map((s) => ({ serviceId: s.id, price: Number(s.price) })),
        notes: notes || undefined,
      });
      router.push('/agenda');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  }

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <BackButton href="/agenda" label="Voltar para Agenda" className="mb-4" />
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Novo agendamento</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Dados do agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/20 p-2 text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {clients?.items?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} – {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Serviços *</Label>
              <div className="space-y-2">
                {services?.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    <span>
                      {s.name} – R$ {Number(s.price).toFixed(2)} ({s.duration} min)
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {selectedServices.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Duração total: {totalDuration} min. Total: R$ {totalPrice.toFixed(2)}
              </p>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Agendar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
