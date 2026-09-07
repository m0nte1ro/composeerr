# Local production deployment

## Sizing

For Composeerr alone on an i5-12400, start with **2 vCPU, 4 GB RAM, 1 GB swap and 24 GB SSD**. This is a starting estimate, not a measured minimum; it includes headroom to build the image locally. If building elsewhere, 2 GB RAM is a reasonable runtime starting point. Music storage, Lidarr and Navidrome are separate services and are not included in these allocations.

Assume a fresh **Debian 13 amd64** LXC and a root shell for the following installation commands. For Proxmox, enable **Start at boot**, **Nesting** and **keyctl** on the LXC before installing Docker. Proxmox recommends a QEMU VM for Docker workloads; a VM is the alternative if nested Docker encounters host-kernel restrictions. These LXC options are host settings, not commands to execute inside the guest.

References: [Proxmox container documentation](https://pve.proxmox.com/pve-docs/pct.1.html), [Docker on Debian](https://docs.docker.com/engine/install/debian/).

## Install Docker (fresh Debian guest, root shell)

```bash
apt-get update
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
cat > /etc/apt/sources.list.d/docker.sources <<DOCKER_APT
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
DOCKER_APT
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker.service containerd.service
docker run --rm hello-world
```

## Automatic deployment after pushes to main

The workflow `.github/workflows/deploy.yml` builds on GitHub's Ubuntu runner and
publishes `ghcr.io/m0nte1ro/composeerr:latest` and `:sha-COMMIT`. The deploy job runs
on your LXC using the labels `self-hosted`, `linux`, `composeerr-prod`.
It pulls the exact image **digest** returned by that build, refreshes the Compose
file from the same commit, and waits for health before reporting success.
The workflow serializes build/deploy runs; a running deployment is not cancelled.
GitHub can replace a pending run with a newer push, so rapid pushes may skip
intermediate commits while still deploying the newest queued version.

The changes must first be committed and pushed/merged into `main`; editing a local
branch does not activate this workflow. No image is published until the build job
runs successfully. Neither the GitHub configuration nor the LXC runner is created
by merely adding these files.

### One-time runner setup

After installing Docker, run as root inside the LXC:

```bash
useradd --create-home --shell /bin/bash composeerr-runner
usermod -aG docker composeerr-runner
install -d -o composeerr-runner -g composeerr-runner /opt/composeerr
install -d -o composeerr-runner -g composeerr-runner /home/composeerr-runner/actions-runner
su - composeerr-runner
cd ~/actions-runner
```

In GitHub open **m0nte1ro/composeerr → Settings → Actions → Runners → New self-hosted
runner → Linux → x64**. Run the current download, checksum and extraction commands
shown there. Use the registration command with the generated temporary token and
add `--labels composeerr-prod --name composeerr-prod`. Keep automatic runner updates
enabled; the workflow uses `actions/checkout@v6` and requires a current runner.

Do not paste the registration token into tracked files. After registration, return
to the root shell and install the service:

```bash
exit
cd /home/composeerr-runner/actions-runner
./svc.sh install composeerr-runner
./svc.sh start
./svc.sh status
```

The runner must appear **Idle** in GitHub before deployment can execute. It needs
outbound HTTPS to GitHub and GHCR, Docker Compose v2, and write access to
`/opt/composeerr`. No inbound SSH connection from GitHub is needed. The runner's
Docker group gives it administrative access to the guest; reserve it for trusted
production workflows, not pull requests or fork code. Protect `main` accordingly.
[GitHub runner setup](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners).

The build uses `GITHUB_TOKEN` with `packages: write`, and deployment uses
`packages: read`. No personal token needs to be saved on the runner for automatic
deploys. If the GHCR package already exists, grant this repository Actions access
in the package settings. Login credentials are stored temporarily and removed at
job completion. The package can remain private.

### First deployment

Push the production changes to `main` after the runner is ready. Follow the
**Build and Deploy** workflow in GitHub Actions. On success, open
`http://SERVER_IP:3000` and configure the providers through Settings.

The workflow creates `/opt/composeerr/compose.prod.yaml`, preserves local `.env`
settings, and writes the selected digest into `.deploy-image.env`. Run operational
commands from `/opt/composeerr` as the runner user (or with Docker access):

```bash
cd /opt/composeerr
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml ps
curl --fail http://127.0.0.1:3000/api/health
```

For a custom port, put `COMPOSEERR_PORT=3001` in `/opt/composeerr/.env` before deploying.
The deployment healthcheck runs inside the container and remains valid for any
published port. Use the custom port in the browser and Uptime Kuma.

The LXC needs no source checkout or Node installation. SQLite persists in
**composeerr-production-data**, mounted at `/app/data`. Keep its backups private:
it contains provider credentials. A fresh named volume inherits the image's
UID/GID 1000 ownership. This is a trusted-LAN deployment; the application currently
has no user login/access-control layer.

### Manual deployment and local build fallback

With a checkout containing these changes, and after an image has been published:

```bash
# Required only for a private package: sign in with a token having read:packages.
# docker login ghcr.io -u m0nte1ro
cd /path/to/checkout
COMPOSEERR_IMAGE=ghcr.io/m0nte1ro/composeerr@sha256:REPLACE_WITH_DIGEST bash docker/deploy-production.sh
```

The deploy directory must already exist and be writable. You can use a previous
digest for an explicit rollback, but back up data first: rolling back an image does
not undo SQLite schema/data changes. Failed health checks fail the workflow; there
is no automatic application or database rollback, and the replacement container
may remain unhealthy. Inspect logs before retrying.

To build locally instead of using GHCR, in a source checkout:

```bash
docker build --target production -t composeerr:production .
COMPOSEERR_IMAGE=composeerr:production docker compose -f compose.prod.yaml up -d --wait --wait-timeout 180
```

## Autostart and health

`restart: always` restarts an exited container and starts it after Docker restarts. Docker is enabled at guest boot by the installation commands. **The LXC itself must also have Start at boot enabled in Proxmox.**

`docker compose down` removes the container, so it cannot autostart until `up -d` recreates it. An unhealthy status alone does not trigger Docker's restart policy; it is an alert signal. [Docker restart policy documentation](https://docs.docker.com/engine/containers/start-containers-automatically/).

The image and Compose healthcheck call `/api/health`. It checks the application and a SQLite read, returns HTTP 200 with `{"status":"ok"}` or HTTP 503 on database failure inside the health handler (application startup failures can return HTTP 500), and disables caching. It does not test database writes or remote providers: a Last.fm/Lidarr outage must not make Composeerr itself appear down.

In **Uptime Kuma**, add an **HTTP(s)** monitor:

- Name: Composeerr
- URL: `http://SERVER_IP:3000/api/health`
- Interval: 60 seconds
- Accepted status: 200
- Retries: 3

Use an address reachable from Kuma's own container. Monitor Lidarr and Navidrome separately if desired; no Docker socket access is required for this HTTP monitor.

## Operations and backups

```bash
# Recent logs (rotation is limited to three 10 MB files)
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml logs --tail=100 -f

# Restart the application
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml restart

# Recreate the pinned deployed version
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml up -d --wait --wait-timeout 180
```

For a consistent backup, stop Composeerr and archive the whole data volume, including any SQLite WAL files:

```bash
mkdir -p backups
chmod 700 backups
backup_image=$(docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml images -q composeerr)
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml stop
docker run --rm --user 0 --entrypoint tar \
  -v composeerr-production-data:/data:ro \
  -v "$PWD/backups:/backup" \
  "$backup_image" -czf /backup/composeerr-data.tar.gz -C /data .
chmod 600 backups/composeerr-data.tar.gz
docker compose --env-file .env --env-file .deploy-image.env -f compose.prod.yaml start
```

Never use `down -v` or remove the production volume unless you intend to delete application data. Back up before upgrading. Development data is separate and is not automatically imported.

### Existing production installation with ./data

The previous production Compose file used a bind mount at `./data`. The new volume starts empty. If you already used that configuration, stop the old deployment before replacing its files and preserve the complete `./data` directory. After pulling the new image, copy it once into a **new, empty** volume before starting the new deployment:

```bash
docker volume create composeerr-production-data
docker run --rm --user 0 --entrypoint sh \
  -v "$PWD/data:/old:ro" \
  -v composeerr-production-data:/new \
  ghcr.io/m0nte1ro/composeerr:latest -c 'test -z "$(ls -A /new)" && cp -a /old/. /new/ && chown -R 1000:1000 /new'
```

Do not run this over an existing populated volume.
