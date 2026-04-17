FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json ./
RUN npm install --legacy-peer-deps

# --- builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime ---
FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3330
ENV HOSTNAME=0.0.0.0

RUN addgroup -S tradepad && adduser -S tradepad -G tradepad
COPY --from=builder /app/public ./public
COPY --from=builder --chown=tradepad:tradepad /app/.next/standalone ./
COPY --from=builder --chown=tradepad:tradepad /app/.next/static ./.next/static
COPY --from=builder --chown=tradepad:tradepad /app/drizzle ./drizzle
COPY --from=builder --chown=tradepad:tradepad /app/src/lib/db ./src/lib/db
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

RUN mkdir -p /app/data/screenshots /app/data/backups && chown -R tradepad:tradepad /app/data
USER tradepad

EXPOSE 3330
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
