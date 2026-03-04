# Barber CRM

Sistema web de **CRM e Gestão para Barbeiro Autônomo** — single-tenant, pronto para produção.

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
- **Railway / Render / etc.**: se usar Dockerfile, defina **Root Directory** = `backend` para o serviço da API. Se usar buildpack Node (sem Docker), configure **Build Command** = `npm run build` e **Start Command** = `npm run start:prod`.

## Deploy no Vercel (só frontend)

O Vercel faz deploy apenas do **frontend** (Next.js). O backend (NestJS) precisa estar em outro serviço (Railway, Render, Fly.io, etc.).

1. No [Vercel](https://vercel.com), importe o repositório **barberCRM**.
2. Em **Project Settings → General → Root Directory** clique em **Edit** e defina: **`frontend`**.
3. Confirme **Framework Preset: Next.js** e **Build Command: `npm run build`** (já vem do `frontend/package.json`).
4. Em **Environment Variables** adicione (obrigatório para o login funcionar):
   - `NEXT_PUBLIC_API_URL` = URL **pública** do seu backend (ex: `https://sua-api.railway.app`).  
   Se não configurar, ao clicar em Entrar aparecerá erro de conexão (o Vercel não acessa `localhost`).
5. Faça o **Deploy**.

6. Se aparecer *"No Output Directory named public"*: em **Settings → General** deixe **Output Directory** em branco (não use `public`). O frontend já tem `vercel.json` e `next.config.js` ajustados para o Vercel.

Assim o Vercel usa só a pasta `frontend` e não tenta rodar o build do backend (evita o erro `nest: command not found`).

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

## Próximos passos (opcional)

- [ ] Lembretes WhatsApp (24h antes)
- [ ] Link público de agendamento
- [ ] Campanhas e mensagem de aniversário
- [ ] Exportação PDF/Excel dos relatórios
- [ ] Backup automático diário (cron + script)

## Licença

Uso privado / single-tenant.
