'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import {
  connectWhatsApp,
  fetchWhatsAppStatus,
  testWhatsApp,
  type WhatsAppStatus,
} from '@/lib/whatsapp-client';

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Teste de envio pelo Barber CRM.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; details?: string } | null>(
    null,
  );

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchWhatsAppStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status || status.connected || !status.instance) return;
    const interval = setInterval(loadStatus, 4000);
    return () => clearInterval(interval);
  }, [status?.connected, status?.instance, loadStatus]);

  async function handleConnect() {
    setConnecting(true);
    setResult(null);
    try {
      const data = await connectWhatsApp();
      setStatus(data);
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erro ao conectar',
      });
    } finally {
      setConnecting(false);
    }
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      await testWhatsApp(phone.replace(/\D/g, ''), message);
      setResult({
        ok: true,
        message: 'Mensagem enviada! Verifique o WhatsApp do número informado.',
      });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Falha ao enviar',
      });
    } finally {
      setSending(false);
    }
  }

  const stateLabel = status?.connected
    ? 'Conectado'
    : status?.state === 'connecting'
      ? 'Aguardando leitura do QR Code'
      : status?.instance
        ? 'Desconectado'
        : 'Não configurado';

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Configurações
        </Link>
      </div>

      <h1 className="mb-2 text-xl font-bold sm:text-2xl">WhatsApp</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Conecte seu WhatsApp aqui. Depois disso, confirmações da agenda, campanhas e aniversários
        saem automaticamente pelo seu número.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5" />
            Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !status?.platformConfigured ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  A Evolution API ainda não está configurada na plataforma. Quem administra o Barber
                  CRM precisa adicionar na <strong>Vercel</strong> (ou no Render do backend):
                </p>
              </div>
              <ul className="ml-7 list-disc text-xs text-muted-foreground">
                <li>
                  <code className="rounded bg-muted px-1">EVOLUTION_API_URL</code> ou{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_API_URL</code>
                </li>
                <li>
                  <code className="rounded bg-muted px-1">EVOLUTION_API_KEY</code> ou{' '}
                  <code className="rounded bg-muted px-1">WHATSAPP_API_KEY</code>
                </li>
              </ul>
              <p className="ml-7 text-xs text-muted-foreground">Depois faça Redeploy.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {status.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{stateLabel}</span>
                {status.instance && (
                  <span className="text-xs text-muted-foreground">({status.instance})</span>
                )}
              </div>

              {!status.connected && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Clique em conectar, abra o WhatsApp no celular →{' '}
                    <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e
                    escaneie o QR Code abaixo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleConnect} disabled={connecting}>
                      {connecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando QR Code…
                        </>
                      ) : status.instance ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Atualizar QR Code
                        </>
                      ) : (
                        'Conectar WhatsApp'
                      )}
                    </Button>
                    {status.instance && (
                      <Button variant="outline" onClick={loadStatus} disabled={connecting}>
                        Verificar status
                      </Button>
                    )}
                  </div>
                  {status.qrCode && (
                    <div className="inline-block rounded-lg border border-border bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={status.qrCode}
                        alt="QR Code WhatsApp"
                        className="h-56 w-56 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {status.connected && (
                <p className="text-sm text-green-700 dark:text-green-300">
                  Seu WhatsApp está pronto para enviar confirmações, campanhas e mensagens de
                  aniversário.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar mensagem de teste</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use seu próprio número para validar o envio antes de uma campanha.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número (DDD + número)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="98985894988"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={sending || !status?.connected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <textarea
                id="message"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={sending || !status?.connected}
              />
            </div>
            <Button type="submit" disabled={sending || !status?.connected}>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
