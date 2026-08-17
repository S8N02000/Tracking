# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Build du frontend Vue 3
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /build

COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install && \
    npm install -g \
      better-sqlite3@11.8.1 \
      express@4.21.2 \
      cors@2.8.5 \
      dotenv@16.4.7 \
      helmet@8.0.0 \
      multer@1.4.5-lts.1
COPY . .

RUN npm run build

# ============================================================
# Stage 2 — Runtime production
# ============================================================
FROM node:22-alpine AS production

# Dépendances build (C++)
RUN apk add --no-cache \
      python3 \
      make \
      g++ \
      sqlite-dev \
    && npm install -g \
      better-sqlite3@11.8.1 \
      express@4.21.2 \
      cors@2.8.5 \
      dotenv@16.4.7 \
      helmet@8.0.0 \
      multer@1.4.5-lts.1 \
    && mkdir -p /app/sqlite /app/log /app/stock /app/sport

WORKDIR /app

# Copie node_modules (global dans le builder) → /app/node_modules
COPY --from=builder /usr/local/lib/node_modules ./node_modules

# Copie server src → /app/server/src  (builder copies as root → fix ownership)
COPY --from=builder --chown=1000:1000 /build/server/src ./server/src

# Copie le bundle SPA → /app/client/dist
COPY --from=builder /build/client/dist ./client/dist

# Lien symbolique: node importe depuis /app/server/src → cherche /app/server/node_modules
RUN ln -s /app/node_modules /app/server/node_modules && \
    mkdir -p /app/backup_reports

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# NOTE: /app et /app/backup_reports sont créés root-owned
# L'entrypoint les chown vers 1000:1000 au démarrage (s8n = UID host)

COPY <<EOF /entrypoint.sh
#!/bin/sh
# Fix ownership for all runtime directories AND server source files
chown -R 1000:1000 /app/backup_reports /app/log /app/stock /app/sport /app/server 2>/dev/null || true
exec node server/src/server.js
EOF
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]
