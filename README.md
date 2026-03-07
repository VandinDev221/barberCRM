# Barber CRM

Sistema web de **CRM e Gestão para Barbeiro Autônomo** — single-tenant, pronto para produção e **licenciamento (aluguel)**.

## Funcionalidades

- **Autenticação**: Login, refresh token, recuperação de senha
- **Clientes (CRM)**: Cadastro, histórico, VIP, busca
- **Agenda**: Calendário semanal, status (agendado/confirmado/concluído/cancelado)
- **Serviços**: Preço, duração, categoria
- **Financeiro**: Pagamentos (Pix, dinheiro, cartão), resumo por período
- **Fidelização**: Pontos, meta de visitas, ranking
- **Estoque**: Itens, quantidade mínima, alertas
- **Relatórios**: Faturamento, serviços mais vendidos, clientes inativos
- **Dashboard**: Faturamento do dia/mês, próximo atendimento, inativos 30 dias

## Stack

- **Backend**: Node.js, NestJS, TypeScript, PostgreSQL, Prisma, JWT
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN-style UI, React Query
- **Infra**: Docker, Docker Compose

## Pré-requisitos

- Node.js 20+
- PostgreSQL 16 (ou use Docker)
- npm ou yarn

## Desenvolvimento local

### 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com DATABASE_URL e JWT_SECRET
```

### 2. Banco de dados

```bash
# Com Docker (recomendado)
docker-compose up -d postgres

# Ou use um PostgreSQL já instalado e ajuste DATABASE_URL no .env
```

### 3. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed   # ou: npx ts-node prisma/seed.ts
npm run start:dev
```

API: http://localhost:3001/api  
Swagger: http://localhost:3001/api/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

**Login padrão (após seed):**  
E-mail: `admin@barber.com`  
Senha: `admin123`

**Dados de demonstração (seed completo):**  
Ao rodar `npm run db:seed` (ou `npx ts-node prisma/seed.ts`) na pasta backend, são criados: 10 clientes, 15 atendimentos passados com pagamentos, 5 agendamentos (hoje e amanhã), fidelização e 5 itens de estoque. Assim o dashboard, agenda, financeiro e relatórios já exibem dados para o cliente.

## Produção com Docker

```bash
# Build e sobe todos os serviços (postgres, backend, frontend)
docker-compose up -d

# Definir segredos em produção
export JWT_SECRET="seu-secret-forte"
export JWT_REFRESH_SECRET="outro-secret-forte"
docker-compose up -d
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001  
- PostgreSQL: localhost:5432 (user: barber, db: barber_crm)

### Aplicar schema e seed no banco (primeira vez)

```bash
# Entrar no backend e rodar migrations/seed
docker-compose exec backend sh
npx prisma db push
npx ts-node prisma/seed.ts
exit
```

### Erro "Cannot find module '/app/dist/main.js'"

Significa que a imagem foi criada **sem** rodar o build do NestJS. Certifique-se de:

- **Docker**: usar o Dockerfile da pasta `backend` com **contexto** igual à pasta backend:
  - `docker build -f backend/Dockerfile backend/` (a partir da raiz do projeto)
  - Ou `docker-compose build backend` (o `docker-compose.yml` já usa `context: ./backend`).
- **Railway / Render / etc.**: se usar Dockerfile, defina **Root Directory** = `backend` (sem barra: `backend`, não `/backend`) para o serviço da API. Se usar buildpack Node (sem Docker), configure **Build Command** = `npm run build` e **Start Command** = `npm run start:prod`.

### Erro "Cannot find module '/app/backend/dist/main'"

Significa que o serviço está rodando a partir da **raiz do monorepo** e o `dist` do backend não está disponível no container. **Solução:** crie um serviço só para a API e defina **Root Directory** = **`backend`**. Assim o build e o start rodam dentro da pasta `backend`, o `dist` fica em `/app/dist` e o comando `npm start` (ou `npm run start:prod`) funciona.

## Deploy do backend no Railway

Para o backend subir sem erro no Railway (Railpack), use **um serviço dedicado** com a pasta do backend como raiz:

1. No projeto Railway, crie um **novo serviço** (ou use o que já existe para a API).
2. Conecte o mesmo repositório e, nas configurações do serviço:
   - **Root Directory**: defina como **`backend`** (obrigatório). Use sem barra: `backend`, não `/backend`.
3. **Variáveis de ambiente** (obrigatórias): no serviço do backend, vá em **Settings → Variables** e adicione:
   - `DATABASE_URL` — URL do PostgreSQL (ex.: do próprio Railway ou externo)
   - `JWT_SECRET` — string segura para assinar o token (ex.: `openssl rand -base64 32`)
   - `JWT_REFRESH_SECRET` — outra string segura para o refresh token
   - `BARBER_TZ_OFFSET_HOURS` — fuso do barbeiro para o link público (Brasil = **3**). **Obrigatório** para os horários ocupados no link público baterem com a Agenda: sem isso, no servidor em UTC aparecem 12:00/12:30 ocupados em vez de 09:00/09:30. Depois de definir, faça **Redeploy** do backend.
   Se faltar `JWT_SECRET` ou `JWT_REFRESH_SECRET`, a API não sobe e exibe erro pedindo para configurar nas variáveis do deploy.
4. Não altere Build/Start: o Railpack vai usar `npm install`, `npm run build` e `npm start` a partir da pasta `backend`. O script `start` do backend já está como `node dist/main` para produção.
5. **Conferir se o deploy está atualizado:** abra no navegador `https://SEU-BACKEND.up.railway.app/api/notifications/health`. Deve retornar `{"ok":true,"module":"notifications"}`. Se retornar **404**, o Root Directory não está como `backend` ou o último deploy não usou o código novo — defina **Root Directory** = **`backend`** e faça **Redeploy**.

Assim o build gera `dist/main.js` dentro do serviço e o start encontra o arquivo. O frontend (Vercel ou outro) deve apontar `NEXT_PUBLIC_API_URL` para a URL pública desse serviço.

**Criar tabelas no banco (primeira vez):** se aparecer *"The table \`public.User\` does not exist"*, o schema ainda não foi aplicado no PostgreSQL do Railway. Rode **uma vez** na sua máquina (com a mesma `DATABASE_URL` do Railway):

```bash
cd backend
# Use a DATABASE_URL do Railway (copie em Variables do serviço Postgres)
set DATABASE_URL=postgresql://usuario:senha@host:porta/banco
npx prisma db push
npx prisma db seed
```

Ou no Railway: no serviço do **backend**, abra **Settings** → **Variables** e copie o valor de `DATABASE_URL`; no seu PC, no terminal na pasta `backend`, defina essa variável e execute `npx prisma db push` e `npx prisma db seed` (seed cria o usuário admin e dados de exemplo).

**Erro 500 no /api/dashboard ou na Agenda:** se após um deploy novo a API retornar 500, o banco pode estar sem a coluna mais recente (ex.: `from_public_link`). Rode de novo **`npx prisma db push`** apontando para a `DATABASE_URL` do Railway (no seu PC, na pasta `backend`). Isso aplica as alterações do schema sem apagar dados.

**Se aparecer aviso do Prisma sobre OpenSSL** (`Prisma failed to detect the libssl/openssl version`): pode ignorar se o Prisma Client for gerado e a API subir; em muitos ambientes o client funciona mesmo assim.

**Se der erro `libssl.so.1.1: No such file or directory` ou `Prisma engines do not seem to be compatible`:** no Railway, em **Variables** do backend, adicione:
- **`RAILPACK_DEPLOY_APT_PACKAGES`** = **`libssl3`**  
**Se der "could not locate the Query Engine for runtime linux-musl":** o schema já inclui `linux-musl` e `linux-musl-openssl-3.0.x`. Se a imagem tiver só OpenSSL 3, defina também **`PRISMA_QUERY_ENGINE_LIBRARY`** = **`/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node`** para forçar o engine compatível com libssl3. Faça **Redeploy** depois.

## Deploy no Vercel (só frontend)

O Vercel faz deploy apenas do **frontend** (Next.js). O backend (NestJS) precisa estar em outro serviço (Railway, Render, Fly.io, etc.).

1. No [Vercel](https://vercel.com), importe o repositório **barberCRM**.
2. Em **Project Settings → General → Root Directory** clique em **Edit** e defina: **`frontend`** (sem barra: `frontend`, não `/frontend`).
3. Confirme **Framework Preset: Next.js** e **Build Command: `npm run build`** (já vem do `frontend/package.json`).
4. Em **Environment Variables** adicione (obrigatório para o login funcionar):
   - `NEXT_PUBLIC_API_URL` = URL **pública** do seu backend (ex: `https://sua-api.railway.app`).  
   Se não configurar, ao clicar em Entrar aparecerá erro de conexão (o Vercel não acessa `localhost`).
5. Faça o **Deploy**.

6. Se aparecer *"No Output Directory named public"*: em **Settings → General** deixe **Output Directory** em branco (não use `public`). O frontend já tem `vercel.json` e `next.config.js` ajustados para o Vercel.

Assim o Vercel usa só a pasta `frontend` e não tenta rodar o build do backend (evita o erro `nest: command not found`).

## Backup do banco

Com `DATABASE_URL` definida e `pg_dump` instalado (cliente PostgreSQL):

- **Linux/macOS:** `cd backend && mkdir -p backups && DATABASE_URL="sua_url" sh scripts/backup.sh`
- **Windows (PowerShell):** `cd backend; $env:DATABASE_URL = "sua_url"; .\scripts\backup.ps1`

O arquivo é salvo em `backend/backups/barber-backup-AAAA-MM-DD-HHmm.sql`. Para backup automático diário, agende um cron (Linux) ou Task Scheduler (Windows) com o comando acima.

## Scripts úteis

| Comando (raiz) | Descrição |
|----------------|-----------|
| `npm run dev` | Sobe backend e frontend em modo desenvolvimento |
| `npm run build` | Build backend + frontend |
| `npm run docker:up` | Sobe stack com Docker |
| `npm run db:push` | Aplica schema Prisma (backend) |
| `npm run db:seed` | Roda seed (backend) |
| `npm run db:studio` | Abre Prisma Studio (backend) |

## Estrutura do projeto

```
barber/
├── backend/           # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── modules/   # auth, clients, appointments, services, payments, reports, inventory, dashboard, loyalty, settings
│       ├── common/    # Prisma, guards, decorators
│       └── main.ts
├── frontend/          # Next.js App Router
│   ├── app/           # dashboard, clientes, agenda, financeiro, estoque, relatorios, fidelizacao, settings
│   ├── components/
│   └── lib/           # api, utils
├── docker-compose.yml
├── .env.example
└── README.md
```

## API (Swagger)

Com o backend rodando: **http://localhost:3001/api/docs**

Autenticação: use o token JWT retornado no login em **Authorize** (Bearer).

## Segurança

- Senhas com bcrypt
- Rate limit (Throttler) nas rotas
- Validação de entrada (class-validator)
- JWT com refresh token

## Licenciamento (aluguel)

O Barber CRM é oferecido sob **licença de uso (aluguel)**. Cada instalação é **single-tenant**: um banco e um ambiente por cliente. Inclui:

- Instalação e configuração (backend + frontend + banco)
- Atualizações de correções e melhorias durante o período contratado
- Documentação e suporte para uso

Para **contratar ou saber valores**: **contato@seudominio.com** (substitua pelo seu e-mail ou WhatsApp).

## Funcionalidades já incluídas

- **Link público de agendamento:** qualquer pessoa pode agendar em `/agendar` (ex: `https://seu-site.com/agendar`) sem login. O admin vê na **Agenda** os agendamentos como "Aguardando confirmação" e pode clicar em **Confirmar e notificar WhatsApp**; após confirmar, o sistema envia uma mensagem para o WhatsApp do cliente (se configurado).
- **Notificação WhatsApp na confirmação:** defina **`WHATSAPP_WEBHOOK_URL`** (e opcionalmente **`WHATSAPP_WEBHOOK_HEADERS`** em JSON) nas variáveis do backend. O sistema faz POST com `{ "phone": "5511999999999", "message": "..." }`. Conecte a um serviço que envia WhatsApp (Z-API, Evolution API, Zapier, etc.). Veja abaixo **"Notificação WhatsApp com Vercel"** para usar a função pronta no frontend.
- **Mensagem de aniversário (automática):** todo dia às 09:00 (fuso do barbeiro), o backend envia um WhatsApp de parabéns para clientes que têm data de nascimento cadastrada e fazem aniversário naquele dia. Não precisa de interação do admin. Requer `WHATSAPP_WEBHOOK_URL`; opcionalmente defina `BIRTHDAY_WHATSAPP_ENABLED=false` no backend para desativar.
- **Exportação CSV:** na tela Relatórios, use "Exportar CSV" em Faturamento, Serviços mais vendidos e Clientes inativos.
- **Backup:** script em `backend/scripts/backup.sh` (e `.ps1` no Windows) para backup do PostgreSQL; veja seção "Backup do banco" acima.

## Notificação WhatsApp com Vercel

Para o aviso por WhatsApp ao confirmar agendamento do link público, você pode usar a **rota de webhook** que já existe no frontend (Vercel). O backend (Railway) chama essa URL; a Vercel encaminha para sua API de WhatsApp.

### 1. APIs não oficiais que você pode usar

Todas são **não oficiais** (não são a API oficial Meta/WhatsApp Business). O sistema já suporta:

| API | Site / tipo | Uso no Brasil | Observação |
|-----|-------------|----------------|------------|
| **Z-API** | [z-api.io](https://www.z-api.io) | Muito usado, pago, estável | Body: `phone` + `message`. Header opcional: `Client-Token`. |
| **Evolution API** | Open source (self-host ou hospedado) | Grátis se hospedar; instável em alguns hosts | Body: `number` + `text`. Defina `WHATSAPP_PROVIDER=evolution` na Vercel. |
| **Outras** | Uazapi, etc. | Se aceitarem `phone`+`message` em POST | Use como Z-API (deixe `WHATSAPP_PROVIDER` em branco). |

Crie conta/instância no provedor escolhido e anote a **URL de envio** e o **token** (se houver).

### 2. Variáveis na Vercel (projeto do frontend)

Em **Vercel → seu projeto → Settings → Environment Variables** adicione:

**Z-API (padrão):**

| Variável | Valor |
|----------|--------|
| `WHATSAPP_API_URL` | `https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text` |
| `WHATSAPP_CLIENT_TOKEN` | (opcional) Token de segurança da conta Z-API, no header `Client-Token`. |

**Evolution API:**

| Variável | Valor |
|----------|--------|
| `WHATSAPP_API_URL` | `https://SUA_URL_DA_EVOLUTION/message/sendText/NOME_DA_INSTANCIA` (ex.: `https://evolution.seudominio.com/message/sendText/minha-instancia`) |
| `WHATSAPP_PROVIDER` | `evolution` (obrigatório para Evolution) |
| `WHATSAPP_API_KEY` | Chave da API (Evolution usa header `apikey`). Crie em Configurações da instância. |

Faça **Redeploy** do frontend após salvar.

**Subir Evolution API com Docker (no próprio projeto):** na pasta `evolution-api/` há um `docker-compose.yml` pronto para rodar localmente. Para **produção (Barber na Vercel enviar WhatsApp)**, use o **deploy no Railway**: passo a passo em **[evolution-api/README.md](evolution-api/README.md)** na seção **"Deploy no Railway"** (template one-click ou deploy a partir deste repo).

**Passo a passo rápido (Evolution API):**
1. Tenha a Evolution API rodando (Docker na pasta `evolution-api/`, VPS ou Railway) e uma instância criada, com número conectado via QR Code.
2. Na **Vercel** (projeto frontend): adicione `WHATSAPP_API_URL`, `WHATSAPP_PROVIDER=evolution` e `WHATSAPP_API_KEY`; faça Redeploy.
3. No **Railway** (backend): adicione `WHATSAPP_WEBHOOK_URL=https://barber-painel.vercel.app/api/send-whatsapp`; redeploy do backend.
4. Teste: agende pelo link público → na Agenda clique em **Confirmar e notificar WhatsApp** → o cliente deve receber a mensagem no WhatsApp.

**Evolution API – resumo:** A Evolution (evoapicloud) usa o body `{ "number": "5511999999999", "text": "mensagem" }` e o header `apikey` para autenticação. O sistema já envia nesse formato quando `WHATSAPP_PROVIDER=evolution`. Você precisa ter a Evolution rodando (self-host em VPS ou usar um serviço que hospede), criar uma instância, conectar um número via QR Code e copiar a URL base + nome da instância + apikey para as variáveis acima.

### 3. Variável no Railway (backend)

No serviço do **backend** no Railway, em **Settings → Variables** adicione:

| Variável | Valor |
|----------|--------|
| `WHATSAPP_WEBHOOK_URL` | `https://barber-painel.vercel.app/api/send-whatsapp` |

Assim, quando o admin clicar em **Confirmar e notificar WhatsApp** na Agenda, o backend fará POST para essa URL; a função na Vercel recebe e reenvia para a API de WhatsApp com as variáveis que você configurou.

### 4. Testar

Faça um agendamento pelo link público, depois na Agenda clique em **Confirmar e notificar WhatsApp** no card. O cliente deve receber a mensagem no número cadastrado (com DDD, ex.: 11999999999).

Se a sua API usar outro formato de corpo (ex.: campos `number` e `text`), edite o arquivo `frontend/app/api/send-whatsapp/route.ts` e adapte o `body` do `fetch` para o formato esperado.

## Roadmap (futuras versões)

- Lembretes WhatsApp (24h antes do agendamento)
- Campanhas em massa (mensagens promocionais)
- Exportação PDF dos relatórios
