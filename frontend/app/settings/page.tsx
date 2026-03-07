'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export default function SettingsPage() {
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
            <li><strong className="text-foreground">Link de agendamento:</strong> compartilhe <a href="/agendar" className="text-primary hover:underline">/agendar</a> para clientes agendarem sem login.</li>
            <li><strong className="text-foreground">Exportar relatórios:</strong> use o botão &quot;Exportar CSV&quot; na página Relatórios.</li>
            <li><strong className="text-foreground">Backup:</strong> use o script em <code className="bg-muted px-1 rounded">backend/scripts/backup.sh</code> (veja README).</li>
          </ul>
          <p className="text-sm text-muted-foreground pt-2">
            Em breve: lembretes por WhatsApp e campanhas de aniversário.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Notificações ao confirmar agendamento pelo link público. Verifique se o envio está funcionando.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/whatsapp-verificar">Verificar envio WhatsApp</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lembretes e campanhas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lembrete 24h antes do agendamento e mensagem de aniversário (integração WhatsApp Business em versão futura).
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Recurso planejado. Entre em contato com o fornecedor para saber quando estará disponível.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
