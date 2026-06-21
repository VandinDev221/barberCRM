'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Cake, Megaphone, CreditCard } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { bookingUrl } from '@/lib/plan';

const DEFAULT_BIRTHDAY_MESSAGE = 'Olá {{name}}! A equipe da barbearia deseja um feliz aniversário! 🎉 Que este dia seja especial. Até a próxima!';

export default function SettingsPage() {
  const [birthdayMessage, setBirthdayMessage] = useState(DEFAULT_BIRTHDAY_MESSAGE);
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const [birthdaySaved, setBirthdaySaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [bookingLink, setBookingLink] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ slug: string }>('/auth/me')
      .then((me) => {
        if (me.slug) setBookingLink(bookingUrl(me.slug));
      })
      .catch(() => {});
  }, []);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { url } = await apiPost<{ url: string }>('/billing/portal');
      window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  }

  useEffect(() => {
    apiGet<{ key: string; value: string } | null>('/settings?key=birthday_message')
      .then((r) => {
        if (r?.value) setBirthdayMessage(r.value);
      })
      .catch(() => {});
  }, []);

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
          <CardTitle>Configurações gerais</CardTitle>
          <p className="text-sm text-muted-foreground">
            Integrações WhatsApp, backup e preferências podem ser adicionados aqui.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc text-sm text-muted-foreground space-y-1">
            <li>
              <strong className="text-foreground">Link de agendamento:</strong>{' '}
              {bookingLink ? (
                <a href={bookingLink} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                  {bookingLink}
                </a>
              ) : (
                'carregando...'
              )}
            </li>
            <li><strong className="text-foreground">Exportar relatórios:</strong> use o botão &quot;Exportar CSV&quot; na página Relatórios.</li>
            <li><strong className="text-foreground">Backup:</strong> use o script em <code className="bg-muted px-1 rounded">backend/scripts/backup.sh</code> (veja README).</li>
          </ul>
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
            Texto enviado automaticamente no dia do aniversário do cliente (use <code className="bg-muted px-1 rounded">{'{{name}}'}</code> para o nome).
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
            Envie uma mensagem por WhatsApp para vários clientes de uma vez. Selecione os contatos e escreva o texto.
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
