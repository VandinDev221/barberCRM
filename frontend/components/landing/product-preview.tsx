import { Calendar, DollarSign, MessageCircle } from 'lucide-react';

/** Mock visual da agenda e dashboard — espelha a interface real do app. */
export function LandingProductPreview() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          </div>
          <span className="mx-auto text-[10px] text-muted-foreground sm:text-xs">
            barber-painel.vercel.app/agenda
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-5">
          <div className="hidden border-r border-border/60 bg-muted/20 p-3 lg:col-span-1 lg:block">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Menu
            </p>
            {['Dashboard', 'Agenda', 'Clientes', 'WhatsApp', 'Serviços'].map((item, i) => (
              <div
                key={item}
                className={`mb-1 rounded-md px-2 py-1.5 text-xs ${
                  i === 1 ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground'
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-5 lg:col-span-4">
            <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Hoje', value: 'R$ 320', icon: DollarSign },
                { label: 'Atendimentos', value: '6', icon: Calendar },
                { label: 'WhatsApp', value: 'Ativo', icon: MessageCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-background px-2 py-2 sm:px-3 sm:py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground sm:text-[10px]">{label}</span>
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="mt-0.5 text-sm font-bold sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold sm:text-sm">Agenda — semana</p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
              {[
                { day: 'Dom', apt: null },
                { day: 'Seg', apt: '09:00 João' },
                { day: 'Ter', apt: '14:30 Pedro' },
                { day: 'Qua', apt: null },
                { day: 'Qui', apt: '10:00 Lucas' },
                { day: 'Sex', apt: '16:00 Marco' },
                { day: 'Sáb', apt: '11:00 Ana' },
              ].map(({ day, apt }) => (
                <div
                  key={day}
                  className="min-h-[72px] rounded-md border border-border/50 bg-background p-1.5 sm:min-h-[88px] sm:p-2"
                >
                  <p className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">{day}</p>
                  {apt ? (
                    <div
                      className={`mt-1 rounded border px-1 py-0.5 text-[8px] leading-tight sm:text-[9px] ${
                        apt.includes('Lucas')
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      {apt}
                      {apt.includes('Lucas') && (
                        <span className="mt-0.5 block text-[7px] font-medium text-amber-700 dark:text-amber-300">
                          Confirmar
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[8px] text-muted-foreground/60">—</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-[10px] leading-snug text-green-800 dark:text-green-200 sm:text-xs">
                Novo agendamento pelo link · Cliente confirmado via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
