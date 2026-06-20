# Evolution API (Docker) — Barber CRM

Subir a Evolution API com um comando para usar com o [Barber CRM](https://barber-painel.vercel.app) (notificações WhatsApp ao confirmar agendamento).

## Pré-requisito

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados.

## Como subir

1. **Entre na pasta:**
   ```bash
   cd evolution-api
   ```

2. **Crie o arquivo de ambiente:**
   ```bash
   copy .env.example .env
   ```
   (No Linux/Mac: `cp .env.example .env`)

3. **Edite o `.env`** e defina uma chave segura:
   ```
   AUTHENTICATION_API_KEY=minha-chave-super-secreta-123
   ```
   Essa mesma chave você usará na **Vercel** como `WHATSAPP_API_KEY`.

4. **Suba os containers:**
   ```bash
   docker compose up -d
   ```

5. **Acesse:**
   - **Manager (criar instância e conectar WhatsApp):** [http://localhost:8080/manager](http://localhost:8080/manager)
   - **API:** [http://localhost:8080](http://localhost:8080)

## Conectar o WhatsApp

1. Abra **http://localhost:8080/manager**
2. Crie uma nova instância (ex.: nome `barber`)
3. Conecte escaneando o QR Code com o WhatsApp (celular)
4. Quando estiver "Conectado", anote o **nome da instância** (ex.: `barber`)

---

## Deploy no Render (produção)

Para o Barber na Vercel enviar WhatsApp, a Evolution precisa estar acessível na internet. Use **Render** com Docker + Postgres + Redis (ou o `docker-compose.yml` local para testes).

### Passo a passo — Render

1. Crie um **Web Service** no Render apontando para este repositório.
2. **Root Directory:** `evolution-api`
3. Adicione **PostgreSQL** e **Redis** no mesmo projeto Render.
4. **Environment Variables** do serviço Evolution:
   - `AUTHENTICATION_API_KEY` = chave forte (use na Vercel como `WHATSAPP_API_KEY`)
   - `DATABASE_ENABLED` = `true`
   - `DATABASE_PROVIDER` = `postgresql`
   - `DATABASE_CONNECTION_URI` = URL interna do Postgres Render
   - `CACHE_REDIS_ENABLED` = `true`
   - `CACHE_REDIS_URI` = URL interna do Redis Render
   - `SERVER_URL` = `https://SEU-SERVICO.onrender.com`
5. Monte um **disk** em `/evolution/instances` para não perder a sessão do WhatsApp.
6. Acesse `https://SEU-SERVICO.onrender.com/manager`, crie a instância (ex.: `barber`) e conecte o QR Code.
7. **Vercel (Barber frontend):**
   - `WHATSAPP_API_URL` = `https://SEU-SERVICO.onrender.com`
   - `WHATSAPP_INSTANCE` = `barber`
   - `WHATSAPP_PROVIDER` = `evolution`
   - `WHATSAPP_API_KEY` = mesmo valor de `AUTHENTICATION_API_KEY`
   - Redeploy do frontend
8. **Render (backend Barber):** `WHATSAPP_WEBHOOK_URL=https://seu-frontend.vercel.app/api/send-whatsapp`

**Nota:** no plano free do Render o serviço dorme após inatividade — o primeiro envio pode levar até ~1 minuto (cold start).

---

## Usar no Barber CRM (resumo)

**Na Vercel** (projeto frontend):

| Variável | Valor |
|----------|--------|
| `WHATSAPP_API_URL` | `https://SUA-EVOLUTION.onrender.com` |
| `WHATSAPP_INSTANCE` | `barber` (nome da instância) |
| `WHATSAPP_PROVIDER` | `evolution` |
| `WHATSAPP_API_KEY` | Mesmo valor de `AUTHENTICATION_API_KEY` da Evolution |

**No Render** (backend Barber): `WHATSAPP_WEBHOOK_URL=https://seu-frontend.vercel.app/api/send-whatsapp`

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `docker compose up -d` | Sobe a Evolution API em segundo plano |
| `docker compose logs -f` | Ver logs em tempo real |
| `docker compose down` | Para e remove os containers (dados em volumes são mantidos) |

## Referência

- [Evolution API – Documentação](https://doc.evolution-api.com)
- [Evolution API – GitHub](https://github.com/EvolutionAPI/evolution-api)
