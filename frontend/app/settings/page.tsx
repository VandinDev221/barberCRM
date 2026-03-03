'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <CardContent>
          <p className="text-muted-foreground">
            Em uma próxima versão: link de agendamento público, lembretes WhatsApp e campanhas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
