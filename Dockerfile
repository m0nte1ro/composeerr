FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

# better-sqlite3 may need native compilation during npm install.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci


FROM node:24-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM builder AS production-dependencies

RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies /app ./

# The official Node image already contains a non-root "node" user
# with UID/GID 1000, which also works nicely with a normal WSL user.
RUN mkdir -p /app/data \
    && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
