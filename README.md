# Composeerr

Composeerr is a self-hosted music request application. Docker provides the complete development toolchain, including Node.js, npm, native build dependencies, TypeScript, and ESLint.

## Development

The only host requirements are WSL, Git, Docker with Docker Compose, and optionally VS Code.

From a fresh clone:

```bash
git clone <repository>
cd composeerr
docker compose up
```

Open [http://localhost:3000](http://localhost:3000). The repository is bind-mounted into the container, so edits made in WSL are picked up by Next.js Fast Refresh. Dependencies and development SQLite data remain in Docker-managed volumes; no host `node_modules` or `data` directory is needed.

Common commands:

```bash
# Start in the background
docker compose up -d

# Rebuild after Dockerfile or dependency changes
docker compose up --build

# Open a shell with the complete development toolchain
docker compose exec composeerr bash

# Run checks inside Docker
docker compose exec composeerr npm run lint
docker compose exec composeerr npm run build

# Stop development
docker compose down
```

The development volumes are:

- `composeerr-development-node-modules` for `/app/node_modules`
- `composeerr-development-data` for `/app/data`
- `composeerr-development-next-cache` for `/app/.next`

The development entrypoint automatically synchronizes `node_modules` with `package-lock.json`. To reset only the development database:

```bash
docker compose down
docker volume rm composeerr-development-data
docker compose up
```

This leaves the dependency volume intact.

## Production

Production uses the optimized `production` Docker target and `next start`. It remains separate from the default development environment:

```bash
docker compose -f compose.prod.yaml up -d --build
```

Production continues to persist SQLite data in `./data`, independently of the Docker-managed development database. Stop it with:

```bash
docker compose -f compose.prod.yaml down
```
