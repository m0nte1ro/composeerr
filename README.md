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

Pushes to `main` build and publish `ghcr.io/m0nte1ro/composeerr` on GitHub Actions.
A self-hosted runner labeled `composeerr-prod` deploys that exact image digest to
`/opt/composeerr`. The LXC does not build the application.

Production uses Next.js standalone, a persistent named volume, `restart: always`,
rotated logs and `/api/health` for Docker and Uptime Kuma monitoring.

See [the deployment guide](docs/DEPLOYMENT.md) for the required one-time Docker and
runner installation, manual deployment, autostart, monitoring and backups.
