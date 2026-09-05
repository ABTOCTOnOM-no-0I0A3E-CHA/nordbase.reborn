# syntax=docker/dockerfile:1

# Сборка идёт в три слоя, чтобы переустановка зависимостей не повторялась
# при каждой правке кода, а в финальный образ не попали ни исходники, ни dev-пакеты.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Все обращающиеся к БД маршруты помечены force-dynamic, поэтому Postgres на
# этом шаге не нужен. Но модуль env проверяет переменные при импорте и падает
# на пустом DATABASE_URL — подставляем заглушки только для сборки. В runner-слой
# они не переносятся: там свой блок ENV, а боевые значения приходят из compose.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ENV SITE_URL=http://localhost:3000
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Миграции применяются отдельной командой при деплое, поэтому drizzle-kit
# и папка с миграциями нужны и в рантайме.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Загруженные фото живут в томе: пересборка образа не должна их стирать.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads
VOLUME ["/app/public/uploads"]

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
