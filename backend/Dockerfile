FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev

# Builder
FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js || (echo "Build failed: dist/main.js not found" && exit 1)

# Runner
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
RUN test -f dist/main.js || (echo "dist/main.js missing in image" && exit 1)
EXPOSE 3001
CMD ["sh", "-c", "if [ ! -f dist/main.js ]; then echo 'ERROR: dist/main.js not found. Rebuild the image with: docker build --no-cache -t barber-backend .'; exit 1; fi; npx prisma db push --accept-data-loss 2>/dev/null || true; exec node dist/main.js"]
