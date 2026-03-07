'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays } from 'date-fns';
import { apiGet, apiPost } from '@/lib/api';

type Service = { id: string; name: string; price: string; duration: number };
type Slot = { time: string; endTime: string; available: boolean };

export default function AgendarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  useEffect(() => {
    apiGet<Service[]>('/public/services', { cache: 'no-store' })
      .then(setServices)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Não foi possível carregar os serviços.';
        const isConfig = msg.includes('NEXT_PUBLIC_API_URL') || msg.includes('não configurada') || msg.includes('fetch');
        setError(
          isConfig
            ? 'API não configurada. Defina NEXT_PUBLIC_API_URL com a URL do backend (ex: na Vercel: Settings → Environment Variables). Em local: .env.local com NEXT_PUBLIC_API_URL=http://localhost:3001'
            : msg
        );
      });
  }, []);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setTime('');
      setSlotsLoading(false);
      return;
    }
    setTime('');
    setSlotsLoading(true);
    apiGet<{ slots: Slot[] }>(`/public/slots?date=${date}`, { cache: 'no-store' })
      .then((r) => {
        const list = r.slots || [];
        const isToday = date === minDate;
        if (!isToday) {
          setSlots(list);
          return;
        }
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        setSlots(
          list.filter((s) => {
            const [h, m] = s.time.split(':').map(Number);
            const slotMinutes = h * 60 + m;
            return slotMinutes > nowMinutes;
          })
        );
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [date, minDate]);

  function toggleService(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!date || !time || selectedIds.length === 0 || !name.trim() || !phone.trim()) {
      setError('Preencha data, horário, pelo menos um serviço, nome e telefone.');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/public/booking', {
        name: name.trim(),
        phone: phone.trim().replace(/\D/g, ''),
        email: email.trim() || undefined,
        date,
        time,
        serviceIds: selectedIds,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-primary">Agendamento realizado</CardTitle>
            <p className="text-sm text-muted-foreground">
              Em breve você receberá uma confirmação. Em caso de dúvidas, entre em contato com a barbearia.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {date} às {time} – {services.filter((s) => selectedIds.includes(s.id)).map((s) => s.name).join(', ')}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Agendar horário</h1>
        <p className="mb-6 text-muted-foreground">Escolha a data, o horário e os serviços.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data e horário</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <input
                  id="date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 w-full">
                <Label>Horário</Label>
                {!date ? (
                  <p className="text-sm text-muted-foreground">Selecione uma data acima para ver os horários disponíveis.</p>
                ) : slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando horários...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum horário neste dia.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-block h-3 w-3 rounded-full bg-green-500/80 align-middle mr-1" /> Livre
                      {' · '}
                      <span className="inline-block h-3 w-3 rounded-full bg-red-500/80 align-middle mr-1" /> Ocupado
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.available}
                          onClick={() => s.available && setTime(s.time)}
                          className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-90 ${
                            !s.available
                              ? 'bg-red-500/20 text-red-700 border border-red-500/40 cursor-not-allowed dark:bg-red-950/40 dark:text-red-400'
                              : time === s.time
                                ? 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                                : 'bg-green-500/15 text-green-800 border border-green-500/40 hover:bg-green-500/30 dark:bg-green-950/40 dark:text-green-300 dark:border-green-500/30'
                          }`}
                          title={s.available ? `Horário livre: ${s.time}` : 'Horário ocupado'}
                        >
                          {s.time}
                          {!s.available && ' (ocupado)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Serviços</CardTitle>
              <p className="text-sm text-muted-foreground">Selecione um ou mais.</p>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-input p-3 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {Number(s.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {s.duration} min
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11999999999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Agendando...' : 'Confirmar agendamento'}
          </Button>
        </form>
      </div>
    </main>
  );
}
