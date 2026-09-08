# Composeerr

Composeerr is a self-hosted music request application. Docker provides the complete development toolchain, including Node.js, npm, native build dependencies, TypeScript, and ESLint. It's great.

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

For an explicit reset **with a database backup**, stop the application and run:

```bash
docker compose stop composeerr
docker compose run --rm --no-deps composeerr node scripts/reset-instance.mjs --confirm
docker compose up -d
```

The backup is saved inside the data volume under `backups/`. This command clears
accounts, sessions, settings, task history and caches. It is never run automatically
and is not part of an update. Normal rebuilds and restarts retain the data volume.

To replay the provider setup while retaining accounts, sessions and API settings,
run this from `/app` in the instance environment, with the application stopped:

```bash
node scripts/reset-instance.mjs --setup-only --confirm
```

Restart the app, sign in as an administrator and open `/setup`. This starts at
Search; a full reset without `--setup-only` also repeats administrator creation.
Both modes create a backup first.

## Accounts and sign-in

A fresh instance opens `/setup`. Create your administrator account, then configure
Search, Lidarr, Content, Metadata and Artwork. There are no default credentials.
Search, Lidarr and Content require a successful connection test before Next;
editing the configuration invalidates that test. This test gate is client-side.
Each completed step is saved, so signing in again resumes unfinished setup.
Metadata and Artwork reuse the Settings cards; save any edits before continuing.

Existing accounts and provider configuration survive upgrades. Versioned SQLite
migrations mark an existing installation as configured without forcing setup again.
Never delete the data volume or run a reset command as part of an ordinary update.

Settings contains General, Lidarr, Library, Search, Content, Metadata, Artwork and
Scheduled Tasks. Library has its own page for availability providers.

Search selects Last.fm or MusicBrainz explicitly. Last.fm credentials are shared
with Metadata, while enrichment can be enabled separately. MusicBrainz Search
and Content have independent endpoints and authentication. Content can optionally
follow the saved MusicBrainz Search configuration. A lookup-only local mirror works
for Content: its connection test retrieves an artist by MBID, whereas the Search
test performs an indexed search. Artist, album and song searches only display
results with a valid MusicBrainz ID. Results with missing, empty or malformed IDs
are excluded server-side without attempting to resolve them.

Admins can create users and administrators, delete other accounts, and reset their
passwords in General. Reset displays a new temporary password once, revokes the
account's sessions and requires a password change. An admin cannot delete their own
account; the last administrator is protected.
Registration starts **closed**. The admin can enable **Allow new registrations**
in General, let trusted users create accounts at `/register`, and close it again.
Anyone who can reach the site can register and request albums while registration
is open. Closing it does not disable existing accounts. Usernames are case
insensitive and use 3–32 letters, numbers, dots, underscores or hyphens; new
passwords need 8–128 characters. No email or external identity provider is needed.

All users can change their own password using their current password, new
password, and confirmation. Regular users see only this form in Settings.
Provider configuration, credentials, connection tests and scheduled-task controls
are admin-only, including direct API access.

Accounts, hashed passwords, sessions and settings persist in the existing SQLite
data volume. Sign in on another device to use the same instance and its configured
providers. Provider keys and configuration are shared by the instance, not separate
per-user copies. Sessions last 30 days. Signing out ends that device's session;
changing a password signs out every other device.

### Forgotten password

Recovery is available through the Docker command below; no assistant or database editing is needed.
Production installations must first deploy an image containing the recovery command.

The instance owner can reset any account from the server terminal, without the old
password. Run this from the directory containing your Compose file:

```bash
# Development
docker compose exec composeerr node scripts/reset-password.mjs admin

# Production
docker compose -f compose.prod.yaml exec composeerr node scripts/reset-password.mjs admin
```

Replace `admin` with the account's username. If already inside the container, run
`node scripts/reset-password.mjs admin`. In the development checkout,
`npm run reset-password -- admin` is also available. Use the same Compose project
and environment files as your running instance.

The command displays a random temporary password in your terminal. Sign in with it
and choose a new password in General. It revokes that account's sessions and clears
its login/password attempt limits, while preserving other accounts, registration
settings and provider configuration. No restart is needed. A missing database or
unknown username produces an error; it does not create or wipe an instance.

Users without access to the server should ask the instance owner for a reset.
The login page includes this guidance under **Forgot password?** Recovery requires
server access because accounts have no email or external identity provider.

### Public websites and reverse proxies

Serve public installations over HTTPS. Configure the proxy to preserve the
original `Host` and set `X-Forwarded-Proto`. For an explicit public URL, add this
to your Compose `.env` file and recreate the service:

```dotenv
COMPOSEERR_ORIGIN=https://music.example.com
```

This optional setting pins the allowed origin for state-changing requests and
ensures HTTPS session cookies behind a proxy. Without it, Composeerr uses the
request host and protocol, so local HTTP development still works. Once set, use
that URL to sign in; other origins cannot submit forms. The public `/api/health`
endpoint continues to work without a session.

Authentication uses Node's asynchronous scrypt password hashing, random session
cookies with server-side revocation, origin validation for mutations, and SQLite
limits on login, registration and password-change attempts. The password hashing
parameters follow [OWASP's scrypt guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Authentication checks

Run inside the development container (or prefix with `docker compose exec composeerr`):

```bash
npm run lint
npm run build
npm run test:auth
npm run test:reset
```

The integration suite starts a separate production server with a temporary SQLite
database. It checks anonymous access to all application APIs, admin permissions,
setup, user management, registration, password changes, CSRF, rate limits, additive
migrations and sessions across a server restart. Local HTTP fixtures also verify
independent search/content connections and lookup-only MusicBrainz mirrors. It does not call live providers or modify your instance data.

## Production

Pushes to `main` build and publish `ghcr.io/m0nte1ro/composeerr` on GitHub Actions.
A self-hosted runner labeled `composeerr-prod` deploys that exact image digest to
`/opt/composeerr`. The LXC does not build the application.

Production uses Next.js standalone, a persistent named volume, `restart: always`,
rotated logs and `/api/health` for Docker and Uptime Kuma monitoring.

See [the deployment guide](docs/DEPLOYMENT.md) for the required one-time Docker and
runner installation, manual deployment, autostart, monitoring and backups.
