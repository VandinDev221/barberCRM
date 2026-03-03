#!/bin/bash
# Exemplo de deploy em VPS (DigitalOcean/AWS)
# Ajuste REMOTE e PASTA conforme seu ambiente

set -e
REMOTE="${REMOTE:-user@seu-servidor}"
PASTA="${PASTA:-/var/www/barber-crm}"

echo "Deploy Barber CRM -> $REMOTE:$PASTA"

# Build local (opcional: build no servidor)
npm run build

# Enviar arquivos (exclui node_modules e .git)
rsync -avz --exclude node_modules --exclude .git \
  --exclude backend/node_modules \
  --exclude frontend/node_modules \
  --exclude frontend/.next \
  ./ "$REMOTE:$PASTA/"

# No servidor: instalar deps, migrar, reiniciar
ssh "$REMOTE" "cd $PASTA && \
  (cd backend && npm ci --production && npx prisma generate && npx prisma db push) && \
  (cd frontend && npm ci --production && npm run build) && \
  sudo systemctl restart barber-backend barber-frontend || true"

echo "Deploy concluído."
