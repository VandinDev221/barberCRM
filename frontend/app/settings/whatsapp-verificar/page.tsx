'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

type Status = {
  configured: boolean;
  provider: string | null;
  hasApiKey: boolean;
  hasInstance?: boolean;
  hint: string;
};

const CLIENT_TIMEOUT_MS = 30_000;

export default function WhatsAppVerificarPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Teste de envio pelo Barber CRM.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  useEffect(() => {
    fetch('/api/send-whatsapp')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoadingStatus(false);
      })
      .catch(() => {
        setStatus({
          configured: false,
          provider: null,
          hasApiKey: false,
          hint: 'Erro ao verificar configuração',
        });
        setLoadingStatus(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setSending(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), message }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({
          ok: true,
          message: 'Mensagem enviada com sucesso. Verifique o WhatsApp do número informado.',
        });
      } else {
        setResult({
          ok: false,
          message: data.error || 'Falha ao enviar',
          details: data.details,
        });
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      setResult({
        ok: false,
        message: isTimeout
          ? 'Tempo esgotado (30s). A Evolution API no Render pode estar acordando — tente de novo em 1 minuto.'
          : 'Erro de rede ou servidor.',
      });
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Configurações
        </Link>
      </div>
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Verificar envio WhatsApp</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Use esta tela para testar se as notificações WhatsApp estão configuradas corretamente. O mesmo envio é feito quando você clica em &quot;Confirmar e notificar WhatsApp&quot; na Agenda.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5" />
            Status da configuração (Vercel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : status ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.configured ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="text-sm">{status.hint}</span>
              </div>
              {!status.configured && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Na Vercel → Environment Variables:{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_API_URL</code> (URL base da Evolution no Render),{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_INSTANCE</code> (nome da instância),{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_PROVIDER=evolution</code>,{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_API_KEY</code>. Depois faça Redeploy.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível carregar o status.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar mensagem de teste</CardTitle>
          <p className="text-sm text-muted-foreground">
            Informe um número com DDD (ex.: 98985894988) que receberá a mensagem. Use seu próprio WhatsApp para testar.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número (DDD + número)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="98985894988 ou 5598985894988"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <textarea
                id="message"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Texto da mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={sending}
              />
            </div>
            <Button type="submit" disabled={sending || !status?.configured}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                'Enviar teste'
              )}
            </Button>
          </form>

          {result && (
            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                result.ok
                  ? 'border-green-500/50 bg-green-500/10 text-green-800 dark:text-green-200'
                  : 'border-destructive/50 bg-destructive/10 text-destructive'
              }`}
            >
              <p className="font-medium">{result.ok ? 'Sucesso' : 'Erro'}</p>
              <p className="mt-1">{result.message}</p>
              {result.details && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-black/10 p-2 text-xs">
                  {result.details}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Para confirmações da Agenda, o backend no <strong>Render</strong> precisa de{' '}
        <code className="rounded bg-muted px-1">WHATSAPP_WEBHOOK_URL</code> apontando para a URL do seu frontend, ex.:{' '}
        <code className="rounded bg-muted px-1">https://barber-painel.vercel.app/api/send-whatsapp</code>
      </p>
    </div>
  );
}
