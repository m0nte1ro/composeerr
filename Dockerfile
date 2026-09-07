FROM node:24-bookworm-slim AS toolchain

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Keep the complete native build toolchain in development/build stages only.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*


FROM toolchain AS dependencies

COPY package.json package-lock.json ./

RUN npm ci \
    && sha256sum package-lock.json | cut -d " " -f 1 \
        > node_modules/.composeerr-package-lock.sha256


FROM toolchain AS development

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chmod=755 docker/development-entrypoint.sh /usr/local/bin/composeerr-development-entrypoint
COPY --chown=node:node . .

RUN mkdir -p /app/data /app/.next \
    && chown node:node /app/data /app/.next

USER node

EXPOSE 3000

ENTRYPOINT ["composeerr-development-entrypoint"]
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]


FROM toolchain AS builder

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build



FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public

# The official Node image provides the non-root node user (UID/GID 1000).
RUN mkdir -p /app/data \
    && chown node:node /app/data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
