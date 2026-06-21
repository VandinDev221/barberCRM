'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Cake, Megaphone, CreditCard, Link2, Copy, ExternalLink } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { bookingUrl } from '@/lib/plan';
import { slugifyPreview, slugToDisplayName } from '@/lib/slug';

const DEFAULT_BIRTHDAY_MESSAGE =
  'Olá {{name}}! A equipe da barbearia deseja um feliz aniversário! 🎉 Que este dia seja especial. Até a próxima!';

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSaved, setSlugSaved] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [birthdayMessage, setBirthdayMessage] = useState(DEFAULT_BIRTHDAY_MESSAGE);
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const [birthdaySaved, setBirthdaySaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const previewSlug = slugifyPreview(slugInput);
  const bookingLink = previewSlug ? bookingUrl(previewSlug) : '';
  const previewDisplayName =
    businessName.trim() || (previewSlug ? slugToDisplayName(previewSlug) : '');

  useEffect(() => {
    apiGet<{ slug: string; businessName?: string | null }>('/auth/me')
      .then((me) => {
        if (me.slug) setSlugInput(me.slug);
        if (me.businessName) setBusinessName(me.businessName);
        else if (me.slug) setBusinessName(slugToDisplayName(me.slug));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<{ key: string; value: string } | null>('/settings?key=birthday_message')
      .then((r) => {
        if (r?.value) setBirthdayMessage(r.value);
      })
      .catch(() => {});
  }, []);

  async function saveSlug() {
    setSlugSaving(true);
    setSlugSaved(false);
    setSlugError('');
    try {
      const { slug, businessName: savedName } = await apiPatch<{
        slug: string;
        businessName: string;
      }>('/auth/slug', { slug: slugInput, businessName });
      setSlugInput(slug);
      setBusinessName(savedName);
      setSlugSaved(true);
      setTimeout(() => setSlugSaved(false), 3000);
    } catch (err: unknown) {
      setSlugError(err instanceof Error ? err.message : 'Não foi possível salvar o link.');
    } finally {
      setSlugSaving(false);
    }
  }

  async function copyBookingLink() {
    if (!bookingLink) return;
    await navigator.clipboard.writeText(bookingLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { url } = await apiPost<{ url: string }>('/billing/portal');
      window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  }

  async function saveBirthdayMessage() {
    setBirthdaySaving(true);
    setBirthdaySaved(false);
    try {
      await apiPatch('/settings', { key: 'birthday_message', value: birthdayMessage });
      setBirthdaySaved(true);
      setTimeout(() => setBirthdaySaved(false), 3000);
    } finally {
      setBirthdaySaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link de agendamento online
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Escolha o endereço do seu estabelecimento. Seus clientes acessam esse link para agendar
            horários 24h por dia.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Nome do estabelecimento</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Barbearia do João"
            />
            <p className="text-xs text-muted-foreground">
              Exibido na página pública como &quot;Agendar com {previewDisplayName || '…'}&quot;.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-slug">Endereço do link</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="shrink-0 text-sm text-muted-foreground">…/agendar/</span>
              <Input
                id="booking-slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="barbearia-do-joao"
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use letras, números e hífens. Ex.: &quot;Barbearia do João&quot; vira{' '}
              <span className="font-mono text-foreground">barbearia-do-joao</span>
            </p>
          </div>

          {previewSlug && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Link completo
              </p>
              <a
                href={bookingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm text-primary hover:underline"
              >
                {bookingLink}
              </a>
            </div>
          )}

          {slugError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{slugError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveSlug} disabled={slugSaving || !slugInput.trim() || !businessName.trim()}>
              {slugSaving ? 'Salvando...' : slugSaved ? 'Link salvo!' : 'Salvar link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={copyBookingLink}
              disabled={!bookingLink}
            >
              <Copy className="mr-2 h-4 w-4" />
              {linkCopied ? 'Copiado!' : 'Copiar link'}
            </Button>
            {bookingLink && (
              <Button type="button" variant="ghost" asChild>
                <a href={bookingLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir página
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie pagamento, fatura e cancelamento no portal seguro do Stripe.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={openBillingPortal} disabled={portalLoading}>
            {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Conecte seu WhatsApp escaneando o QR Code. Confirmações da agenda, campanhas e
            aniversários usam essa conexão automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/settings/whatsapp">Conectar WhatsApp</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Mensagem de aniversário
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Texto enviado automaticamente no dia do aniversário do cliente (use{' '}
            <code className="rounded bg-muted px-1">{'{{name}}'}</code> para o nome).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={birthdayMessage}
            onChange={(e) => setBirthdayMessage(e.target.value)}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder={DEFAULT_BIRTHDAY_MESSAGE}
          />
          <Button onClick={saveBirthdayMessage} disabled={birthdaySaving}>
            {birthdaySaving ? 'Salvando...' : birthdaySaved ? 'Salvo!' : 'Salvar mensagem'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campanhas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envie uma mensagem por WhatsApp para vários clientes de uma vez. Selecione os contatos e
            escreva o texto.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/campanhas">Criar e enviar campanha</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
