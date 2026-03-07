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

## Deploy no Railway (recomendado para produção)

Para o Barber na Vercel enviar WhatsApp, a Evolution precisa estar acessível na internet. O caminho mais rápido é usar o **template da Evolution no Railway** (já inclui Postgres + Redis + volume).

### Passo a passo — Template Railway

1. **Abrir o template:** [railway.com/new/template/evolution-api-4](https://railway.com/new/template/evolution-api-4) (ou busque "Evolution API" em [railway.com/templates](https://railway.com/templates)).
2. **Deploy:** clique em **Deploy**. O Railway cria um projeto com 3 serviços: Evolution API, Postgres e Redis.
3. **Variáveis:** no serviço **Evolution API**, em **Variables**:
   - Se não existir, crie `AUTHENTICATION_API_KEY` com uma chave forte (ex.: `minha-chave-evolution-123`). **Anote essa chave** — você usará na Vercel como `WHATSAPP_API_KEY`.
   - Confirme que existem referências ao Postgres e Redis (ex.: `DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}`, `CACHE_REDIS_URI=${{Redis.REDIS_URL}}`). O template já costuma preencher isso.
   - `SERVER_URL`: deve ser a URL pública do serviço. No Railway, em **Settings** do serviço Evolution API, gere um **Public Domain** (ex.: `evolution-api-production-xxxx.up.railway.app`) e defina `SERVER_URL=https://evolution-api-production-xxxx.up.railway.app` (use o domínio que o Railway mostrar).
4. **Volume:** no serviço **Evolution API**, em **Settings**, adicione um **Volume** com mount path **`/evolution/instances`** (necessário para não perder a sessão do WhatsApp).
5. **Redeploy** do serviço Evolution API após alterar variáveis/volume.
6. **Manager:** acesse `https://SEU-DOMINIO-RAILWAY/manager` (o mesmo domínio público). Crie uma instância (ex.: `barber`) e conecte o WhatsApp pelo QR Code.
7. **Vercel (Barber):** em **Settings → Environment Variables** do projeto frontend:
   - `WHATSAPP_API_URL` = `https://SEU-DOMINIO-RAILWAY/message/sendText/barber` (troque `barber` pelo nome da sua instância).
   - `WHATSAPP_PROVIDER` = `evolution`
   - `WHATSAPP_API_KEY` = o mesmo valor de `AUTHENTICATION_API_KEY`.
   Faça **Redeploy** do frontend.
8. **Railway (backend do Barber):** no serviço do backend, defina `WHATSAPP_WEBHOOK_URL=https://barber-painel.vercel.app/api/send-whatsapp` e redeploy.

Depois disso, ao clicar em **Confirmar e notificar WhatsApp** na Agenda do Barber, a mensagem deve sair pelo WhatsApp.

### Alternativa — Deploy a partir deste repositório

Se quiser usar o código deste repo no Railway em vez do template:

1. Crie um **novo projeto** no Railway (ou use um existente).
2. Adicione os plugins **PostgreSQL** e **Redis** ao projeto.
3. **New → GitHub Repo** e conecte o repositório do Barber.
4. Crie um **novo serviço** no mesmo projeto e escolha esse repositório. Em **Settings** do serviço:
   - **Root Directory:** `evolution-api`
   - **Dockerfile Path:** (deixe em branco ou `Dockerfile` — o Railway usa o `Dockerfile` dentro de `evolution-api/`).
5. **Variables** do serviço Evolution API (use a sintaxe do Railway para referenciar outros serviços):
   - `AUTHENTICATION_API_KEY` = uma chave sua
   - `DATABASE_ENABLED` = `true`
   - `DATABASE_PROVIDER` = `postgresql`
   - `DATABASE_CONNECTION_URI` = `${{Postgres.DATABASE_URL}}` (ajuste `Postgres` para o nome do serviço Postgres no projeto)
   - `CACHE_REDIS_ENABLED` = `true`
   - `CACHE_REDIS_URI` = `${{Redis.REDIS_URL}}` (ajuste `Redis` para o nome do serviço Redis)
   - `SERVER_URL` = `https://SEU-DOMINIO-GERADO-PELO-RAILWAY`
6. Adicione um **Volume** com mount path **`/evolution/instances`**.
7. Gere um **Public Domain** para o serviço e use em `SERVER_URL` e na Vercel.
8. Siga os passos 6–8 do "Passo a passo — Template Railway" (manager, Vercel, backend).

---

## Usar no Barber CRM (resumo)

**Na Vercel** (projeto frontend):

| Variável | Valor |
|----------|--------|
| `WHATSAPP_API_URL` | `https://SUA-URL-EVOLUTION/message/sendText/NOME_DA_INSTANCIA` |
| `WHATSAPP_PROVIDER` | `evolution` |
| `WHATSAPP_API_KEY` | Mesmo valor de `AUTHENTICATION_API_KEY` da Evolution |

**No Railway** (serviço backend do Barber): `WHATSAPP_WEBHOOK_URL=https://barber-painel.vercel.app/api/send-whatsapp`

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `docker compose up -d` | Sobe a Evolution API em segundo plano |
| `docker compose logs -f` | Ver logs em tempo real |
| `docker compose down` | Para e remove os containers (dados em volumes são mantidos) |

## Referência

- [Evolution API – Documentação](https://doc.evolution-api.com)
- [Evolution API – GitHub](https://github.com/EvolutionAPI/evolution-api)
