# Composeerr Project Context

## Setup and Settings implementation (current)

- New instances require `/setup`: create admin, Search, Lidarr, Content, Metadata, Artwork.
- No default admin/admin account. Setup progress and completion are persisted.
- Existing installations migrate additively using SQLite `user_version`; accounts,
  sessions and provider configuration survive upgrades and do not trigger setup again.
- Reset is explicit: `scripts/reset-instance.mjs --confirm` creates a backup before
  clearing instance data. Add `--setup-only` to reopen provider setup while retaining
  accounts, sessions and API settings. Stop the app first. Never run this script during updates.
- Settings tabs: General, Lidarr, Library, Search, Content, Metadata, Artwork, Scheduled Tasks.
  Library has its own page for availability providers.
- General includes admin user management. Temporary resets revoke sessions and
  require password changes. Regular users only see their own password form.
- Search selects Last.fm or MusicBrainz explicitly, independently of enrichment.
  Last.fm credentials are shared with Metadata; disabling enrichment keeps search working.
- `search.musicbrainz` and `content.musicbrainz` store independent connections.
  Content can follow MusicBrainz Search through `content.use_search` without copying secrets.
- Content tests retrieve an artist by MBID and work with lookup-only HTTP mirrors.
  Search tests exercise indexed search. Both engines verify result MBIDs against
  Content using lookup/browse only: songs recording or track→recording, albums
  release group or release→group, artists artist only. Missing/invalid/unresolvable
  IDs are excluded, without name-based recovery. Canonical IDs override spelling
  differences. Positive identity cache TTL is 24h, confirmed misses 5min, scoped
  by Content connection and entity kind; upstream failures are not cached as misses.
- Setup reuses the Settings provider cards. Search/Lidarr/Content Next requires a
  successful current-form test in the frontend only. Editing invalidates the result,
  including edits during an in-flight test. Optional provider edits must be saved.
- Scheduler execution waits for completed setup; task locks and schedules remain intact.
- `npm run test:auth` covers setup, permissions, user administration, independent
  provider endpoints with local HTTP fixtures, restart persistence and legacy migration.


## Purpose

Composeerr is a self-hosted music request application, conceptually similar to “Seerr for music”.

It is currently **not** intended to be:

- a music player
- a Navidrome replacement
- a Soulseek client
- a download client
- a full replacement for Lidarr

The current architecture uses:

- **MusicBrainz** for canonical music identity/content
- **Lidarr** for acquisition and managed-library operations
- **SQLite / better-sqlite3** for Composeerr settings and future internal state
- **Next.js 16 + TypeScript** as the full-stack application framework
- **Docker Compose** as the default development environment

The most important product rule is:

> **Only albums are requestable.**

Songs and artists are discovery/navigation entities that help the user reach the correct album.

---

## Core Product Behavior

### Search

Composeerr currently supports:

- Song search
- Album search
- Artist search

The primary search type determines the result type.

Current behavior:

- Song search searches recording titles.
- Album search returns MusicBrainz release groups whose primary type is Album.
- Artist search returns artists.
- Search explicitly uses Last.fm or MusicBrainz through the discovery boundary, with separate Content settings.

### Song flow

A Song is not requestable.

```text
Song result
→ Song drawer
→ Appears On
→ Album drawer
→ Request Album
```

The Song drawer includes release/album appearances.

When entering an Album from a Song, the originating recording should be highlighted in the album tracklist when possible.

### Artist flow

An Artist is not requestable.

```text
Artist result
→ Artist drawer
→ Discography
→ Album drawer
→ Request Album
```

Artist details include categorized discography.

### Album flow

Albums are the only requestable entity.

Album details include:

- album metadata
- track list
- managed/available state
- Request Album action when appropriate

---

## Navigation / Drawer Behavior

The current frontend supports the documented navigation flows:

```text
Song → Album → Back → Song
Artist → Album → Back → Artist
```

The current implementation preserves a parent context rather than maintaining a fully generic arbitrary-depth stack.

Do not assume a general-purpose navigation stack already exists.

---

## Current Architecture

The repository was recently refactored to remove large monolithic frontend/backend files.

The intended dependency direction is:

```text
app pages
→ feature components
→ hooks
→ lib/client
→ Next.js API routes
→ server services
→ MusicBrainz / Lidarr / SQLite
```

The **current repository is always the implementation source of truth**.

Do not recreate old pre-refactor structure based on historical context.

### Important frontend areas

```text
components/
├── drawers/
├── home/
├── layout/
├── music/
├── search/
├── settings/
└── ui/

hooks/

lib/
├── client/
├── lidarr/
├── metadata/
└── server/
```

### Architectural principle

The frontend should remain highly componentized and reusable.

Avoid:

- massive `page.tsx` files
- god components
- god hooks
- duplicated UI patterns
- direct `fetch()` scattered through components
- business logic hidden inside presentational primitives
- unnecessary state-management frameworks
- abstraction for abstraction’s sake

If a UI pattern appears repeatedly, strongly consider a reusable component.

---

## Reusable Frontend Components

The refactor introduced reusable components in several domains.

### UI primitives

Examples include:

- `Button`
- `Input`
- `Select`
- `Badge`
- `EmptyState`
- `LoadingState`
- `ErrorState`

### Layout

Examples include:

- `AppShell`
- `Sidebar`
- `SidebarNavItem`
- `MobileNav`
- `LibraryStatusWidget`

### Search

Examples include:

- `SearchBar`
- `SearchTypeSelect`
- `SearchResults`
- `SongResultRow`
- `AlbumResultRow`
- `ArtistResultRow`

### Music UI

Examples include:

- `AlbumArtwork`
- `ArtistArtwork`
- `ArtworkPlaceholder`
- `AvailabilityBadge`
- `TrackList`
- `TrackRow`

### Drawers

Examples include:

- `DrawerShell`
- `DrawerHeader`
- `MediaDrawer`
- `SongDrawer`
- `AlbumDrawer`
- `ArtistDrawer`

### Settings

Examples include:

- `SettingsSection`
- `ProviderCard`
- `SecretField`
- `ConnectionTestStatus`

`ProviderCard` currently provides reusable presentation but is **not yet** a full schema-driven multi-provider settings abstraction.

---

## Current Hooks

### `useMusicSearch`

Owns:

- search type
- query
- submitted query
- search status
- typed search results

Uses the client metadata API layer.

### `useLidarrLibrary`

Owns:

- current Lidarr-derived library state
- library loading state

Exposes library refresh.

### `useMediaDrawer`

Owns:

- selected song / album / artist
- drawer mode
- loading/error state
- current artist section
- parent navigation context

Loads metadata details through the client API layer.

### `useAlbumRequest`

Owns:

- requested IDs
- in-flight request state
- request error

Calls the album request API and triggers library refresh logic.

### `useLidarrSettings`

Owns:

- Lidarr settings form state
- connection-test state
- save state
- Lidarr option data/default IDs

---

## Client API Layer

Browser-side HTTP calls should generally live in `lib/client/`.

Current modules include:

- `lib/client/library.ts`
- `lib/client/lidarr-settings.ts`
- `lib/client/metadata.ts`
- `lib/client/requests.ts`

Direct frontend `fetch()` calls should not be reintroduced into components/hooks unless there is a clear reason.

---

# MusicBrainz / Content

## Current role

MusicBrainz is the canonical music identity/content provider.

Composeerr uses MusicBrainz IDs as stable identity, especially the **Release Group MBID** for albums.

The current public provider already includes non-trivial behavior such as:

- request pacing/rate limiting
- retry/backoff
- retry handling for upstream throttling/load responses
- in-memory TTL caching
- search query construction
- result mapping
- song ranking logic
- artist ranking behavior
- album filtering
- details fetching
- Song “Appears On”
- Album tracklist resolution
- Artist discography

Do not casually rewrite or “simplify” this provider.

The provider implementation remains a known large file and is future tech debt, but it should only be split when the relevant work justifies doing so.

## Public error behavior

MusicBrainz may return 503/other retryable errors.

Server logs may contain detailed upstream diagnostics.

Browser-facing API responses should remain generic and must not expose:

- raw upstream exceptions
- stack traces
- internal paths
- secrets

---

# Future Content Settings

MusicBrainz belongs under the **Content** Settings area, not Metadata.

The public MusicBrainz endpoint should be the default configuration.

The user should eventually be able to replace it with a private/local **MusicBrainz-compatible Web Service endpoint**.

Examples:

```text
https://musicbrainz.org/ws/2
http://musicbrainz.internal:5000/ws/2
```

Possible auth modes may include:

- None
- Basic Auth
- API key / custom header style auth where useful

Important architectural rule:

> Composeerr connects to a MusicBrainz-compatible HTTP API.

Composeerr should **not** expect:

- a MusicBrainz PostgreSQL filesystem path
- direct PostgreSQL connectivity
- an uploaded database dump/ZIP

For local mirrors, the user is expected to deploy/maintain the mirror separately and expose a compatible HTTP API.

The UI should explain this clearly through help text/tooltips.

---

# Lidarr

## Current role

Lidarr is currently the acquisition/backend manager.

Composeerr can currently:

- store Lidarr connection settings
- securely store the Lidarr API key server-side
- test the Lidarr connection
- load root folders
- load quality profiles
- load metadata profiles
- load Lidarr library state
- request a real album

## Library semantics

Important Lidarr behavior:

`GET /api/v1/album` returns many albums Lidarr knows about, not only physically owned or requested music.

Composeerr currently treats albums as part of the managed Lidarr library when:

```text
monitored || trackFileCount > 0
```

Semantics:

- `monitored` = Lidarr manages/wants the album
- `trackFileCount > 0` = Lidarr knows physical files exist
- unmonitored + no files = still requestable even if Lidarr knows album metadata

A simplistic “available” approximation currently uses track/file counts.

## Album identity

Composeerr matches albums against Lidarr using the MusicBrainz **Release Group MBID**.

Avoid title/artist/year heuristics when the MBID is available.

---

## Real Request Album Flow

The current request flow is working and took significant debugging to stabilize.

Do not change it casually.

Approximate flow:

```text
Receive MusicBrainz Release Group MBID
→ find existing Lidarr album by foreignAlbumId
→ if missing, Lidarr lookup
→ add album/artist using saved defaults
→ monitor album
→ ensure artist monitored without monitoring entire discography
→ if newly added:
   RefreshArtist
   wait for completion
   resolve album again
   re-monitor
→ if Search After Add:
   queue AlbumSearch
→ return result
→ refresh Composeerr library state
```

The refactored Lidarr server structure intentionally separates concerns.

Current modules under `lib/server/lidarr/` include areas for:

- HTTP transport
- command handling/polling
- options
- library mapping
- request orchestration
- errors
- server/internal types
- barrel/public exports

Do not collapse these back into one large client file.

---

## Lidarr limitations / Prowlarr future

Real-world testing revealed Lidarr matching/search limitations.

Examples include artist aliases/naming mismatches such as:

```text
Kanye West
vs
Ye
```

Some releases were findable directly in Prowlarr but missed/rejected by Lidarr.

Current decision:

> Do not replace Lidarr now.

A future architecture may add a Prowlarr-assisted fallback, but that work is **on hold**.

Frontend/domain components should avoid unnecessary Lidarr-specific coupling.

Prefer domain concepts such as:

- `requestAlbum`
- `isAlbumManaged`
- `AvailabilityBadge`

rather than spreading backend-specific naming everywhere.

---

# SQLite / Database

Composeerr uses:

- SQLite
- `better-sqlite3`

Development/instance data is not stored in Git.

## Lazy initialization

A previous production build exposed an issue where Next.js imported server routes concurrently and eager DB initialization attempted to apply WAL from multiple workers.

This was fixed.

Important behavior to preserve:

- importing `db.ts` must **not** immediately open SQLite
- connection is created lazily on first real DB use
- WAL remains enabled
- `busy_timeout` remains enabled
- foreign keys remain enabled

Do not regress eager initialization.

---

# Secrets / Security

Secrets such as Lidarr API keys must remain server-side.

The Lidarr settings API must never return the saved plaintext API key.

Existing intended secret-field UX:

```text
Saved API key:
••••••••••••••••
[Change]
```

When changing:

- user enters a new value
- Show/Hide can apply to the newly entered secret
- Cancel restores the unchanged saved state

Do not implement a “reveal existing API key” feature that requires returning the persisted secret to the browser.

Do not expose secrets, stack traces, internal paths, or raw upstream failures through public API responses.

---

# Docker Development Environment

Docker Compose is now the **default development environment**.

The developer onboarding target is:

```bash
git clone <repository>
cd composeerr
docker compose up
```

Nothing else should be required on the WSL host beyond the normal infrastructure.

The developer should **not** need to install on WSL:

- Node
- npm
- nvm
- Python
- make
- gcc/g++
- build-essential
- better-sqlite3 build tooling

The developer should **not** need to:

- run `npm ci` on the host
- create `data/`
- chmod/chown the DB directory
- manually initialize SQLite

## Development compose design

The default `compose.yaml` uses the Dockerfile `development` target.

The development environment includes:

- Node 24
- npm
- Python
- make
- g++
- Git
- dev dependencies
- better-sqlite3 build environment
- Next.js development server

The source repository is bind-mounted into `/app`.

Docker named volumes are used for:

- `/app/node_modules`
- `/app/data`
- `/app/.next`

This isolates dependency/cache/database state from the host and eliminates the previous `SQLITE_CANTOPEN` host-permission problem.

Development data is intentionally separate from production data.

## Development user

The development container runs as the official Node image `node` user:

```text
uid=1000(node)
gid=1000(node)
```

This was validated against the standard WSL first-user UID/GID 1000 workflow.

Known caveat:

A checkout owned by a host user with a different UID/GID may need a future dynamic-UID strategy.

Do not reintroduce root development by accident unless there is a concrete reason.

## Dependency bootstrap

The development entrypoint tracks a hash of `package-lock.json`.

If the Docker `node_modules` volume is empty or the lockfile hash changes, it runs `npm ci` inside the container and updates the marker.

This means dependencies are installed automatically when needed without requiring host-side Node/npm.

## Development commands

Normal start:

```bash
docker compose up
```

Detached:

```bash
docker compose up -d
```

Rebuild Docker layers:

```bash
docker compose up --build
```

Open shell:

```bash
docker compose exec composeerr bash
```

Lint:

```bash
docker compose exec composeerr npm run lint
```

Build:

```bash
docker compose exec composeerr npm run build
```

Stop:

```bash
docker compose down
```

Reset all development Docker volumes, including the development SQLite DB:

```bash
docker compose down -v
```

Then restart with:

```bash
docker compose up
```

HMR/Fast Refresh has been validated: changes to components such as `SearchHero.tsx` are reflected immediately in the WebUI.

---

# VS Code Dev Container

The project supports opening the Docker development environment directly through VS Code Dev Containers.

The intended developer workflow is:

```bash
git clone <repository>
cd composeerr
code .
```

Then:

```text
Dev Containers: Reopen in Container
```

The Dev Container reuses the Composeerr development service.

The expected workspace is `/app`.

This gives VS Code/Codex direct access to the same:

- Node runtime
- npm
- node_modules
- TypeScript dependencies
- ESLint environment
- native build toolchain

used by the running app.

Source files remain bind-mounted from the actual WSL Git checkout, so edits persist normally in Git.

---

# Production Docker Strategy

Production is **not** the normal developer workflow.

Conceptually:

```text
feature/refactor branches
→ development compose / HMR

dev
→ integration/development branch

main
→ production build / release image
```

The Dockerfile still contains production-capable stages.

Production/release behavior is a `main`/release concern and should not make daily development harder.

Do not assume the development DB is production data.

---

# Current Network Constraint

The primary Lidarr instance normally lives at:

```text
http://192.168.1.159:8686
```

This is a private home-network service.

The developer may work away from that network.

When away from home:

- Lidarr being unreachable is expected
- do not overwrite the saved URL just to make tests pass
- do not wipe Lidarr settings
- do not classify connection failure as an application regression
- live Lidarr tests should be reported as blocked by network environment

MusicBrainz/public Internet functionality can still be validated.

---

# Settings Roadmap

The next major product milestone is **finishing Settings**.

Intended Settings information architecture:

```text
General
Lidarr
Search
Content
Metadata
Artwork
Scheduled Tasks
```

The current working Settings implementation is primarily Lidarr.

Future work should grow the reusable Settings shell rather than creating another large controller.

## General

Implemented local authentication:

- Username/password only; no email or external identity provider.
- Offline recovery: `node scripts/reset-password.mjs <username>` inside the instance container generates a temporary password, forces a change, revokes that account’s sessions and clears its auth attempt limits. Shared hashing lives in password-crypto.mjs; Docker includes the CLI and this module. Login help and README explain recovery.
- SQLite stores accounts, scrypt password hashes, hashed session tokens and auth rate limits.
- Initial account: created by the instance owner in `/setup`; no default credentials.
- Registration is disabled by default. Only the admin can enable/disable it in General.
- Every user can change their own password with current/new/confirmation fields. Other sessions are revoked on change.
- Regular users see only General with their password form. Other Settings pages and APIs, provider tests and task controls require admin access.
- All application APIs require a session; auth entry points and the minimal healthcheck are public. Origin checks protect mutations.
- Provider settings remain shared instance configuration, available across devices; they are not per-user copies.
- Optional COMPOSEERR_ORIGIN configures the public origin and HTTPS cookies behind reverse proxies.
- Auth logic lives in lib/server/auth; existing route handlers use withAuth, and pages use requirePageUser. Keep checks at those boundaries when adding routes.
- npm run test:auth exercises a built application with an isolated temporary database. See README for setup and test instructions.

## Lidarr

Current working integration.

Expected fields include:

- URL
- API key
- root folder
- quality profile
- metadata profile
- search after add
- Test Connection

Existing behavior must remain intact.

## Library

Important product definition:

> Library means music actually available to the user.

Library should not inherently mean “Lidarr”.

Potential sources:

- Lidarr
- Navidrome

If Navidrome is configured:

```text
Navidrome = playback/availability truth
Lidarr     = acquisition/management truth
```

If Navidrome is not configured, Lidarr can remain the fallback availability source.

Navidrome must not be mandatory.

## Content

Content is where MusicBrainz configuration belongs.

Planned behavior:

- default public MusicBrainz API
- user-configurable MusicBrainz-compatible endpoint
- optional auth where required
- Test Connection
- clear help text for local mirror expectations

Do not connect directly to a MusicBrainz PostgreSQL database.

## Metadata

Planned initial enrichment providers:

- Last.fm
- Discogs
- TheAudioDB

The UI may use a shared provider-card framework, but provider integrations are not assumed to be identical.

Each provider can have its own:

- credentials
- fields
- validation
- test behavior
- capabilities

Credentials should be configured once and reused across capabilities.

Conceptual capabilities:

```text
Last.fm
- metadata
- popularity
- recommendations

Discogs
- metadata
- release information

TheAudioDB
- metadata
- artwork
```

MusicBrainz remains canonical identity/content.

Future metadata backfill behavior may use provider priority:

```text
missing field
→ provider 1
→ still missing?
→ provider 2
→ ...
```

Do not indiscriminately overwrite valid existing metadata.

Metadata provenance may be useful later.

## Artwork

Explicit initial providers:

- Cover Art Archive
- Fanart.tv

Possible fallback behavior:

```text
Album artwork:
Cover Art Archive
→ Fanart.tv
→ configured TheAudioDB fallback

Artist artwork:
Fanart.tv
→ configured TheAudioDB fallback
```

TheAudioDB should not be configured twice if its credentials already exist under Metadata.

No complicated user-defined artwork priority UI is required initially.

## Scheduled Tasks

Composeerr should eventually have an internal scheduled-task system.

Potential tasks:

- Metadata Backfill
- Artwork Backfill
- Library Sync
- Content / MusicBrainz Health Check

Expected UI fields:

- task name
- enabled
- schedule/frequency
- last run
- last success
- next run
- duration/status
- Run Now button

Prefer friendly schedules such as hourly, every N hours, daily at..., or weekly... rather than forcing cron syntax initially.

Important rule:

> The same scheduled task must not run concurrently with itself.

Tasks will likely be persisted in Composeerr SQLite.

---

# Composite Search

Composite search is a high-priority upcoming feature.

Current decision:

> The secondary filter should remain a plain string, not an entity/MBID lookup.

Reason: resolving the secondary value to an entity first reintroduces search ranking ambiguity.

Example desired UI:

```text
[ Fly Me to the Moon ] [ Song ]

+ Filter

[ Frank Sinatra      ] [ Artist ]
```

Only one secondary filter is needed.

The secondary type cannot equal the primary type.

Examples:

```text
Primary Song
Secondary:
- Artist
- Album
```

```text
Primary Album
Secondary:
- Artist
- Song
```

```text
Primary Artist
Secondary:
- Song
- Album
```

High-value combinations:

- Song + Artist
- Song + Album
- Album + Artist

The primary type determines the result entity type.

The secondary string only constrains the query.

No secondary entity lookup/MBID resolution should be introduced for now.

The unused “All releases” secondary dropdown has been removed. Search currently shows the query input, Song/Album/Artist selector, and Search button. Composite filtering remains planned.

---

# Requests / Library / Main Navigation

Desired navigation direction:

```text
Home
Search
Requests
Library
Discover   (Coming Soon / disabled)
Settings
```

`Activity` is not currently desired as a main navigation item because it overlaps too much with Requests at this stage.

Discover can remain disabled/Coming Soon.

## Requests

Requests should eventually belong to Composeerr itself rather than being reconstructed purely from Lidarr state.

Future request history should likely be persisted in SQLite.

Possible fields:

- request ID
- Release Group MBID
- artist identity
- album title
- artist name
- requested timestamp
- backend
- backend/external album ID
- status

Possible future statuses:

- Requested
- Searching
- Downloading
- Available
- Failed

Do not implement a detailed status engine unless explicitly requested.

## Library

Library should represent actually available music.

Possible future source behavior:

```text
Navidrome configured:
→ use Navidrome as playback/availability truth

No Navidrome:
→ use Lidarr file state as fallback
```

Navidrome is optional.

## Discover

Discover is planned but not implemented.

Last.fm may eventually provide recommendation/discovery signals.

Do not implement Discover unless explicitly requested.

---

# Current Known Tech Debt

Do not refactor all of this immediately.

Address it only when the relevant feature makes the boundary necessary.

Known areas:

- MusicBrainz public provider implementation is still large
- Home orchestration still contains some cross-hook coordination
- Settings orchestration must evolve for multiple tabs/providers
- `ProviderCard` is currently more presentation than full provider-schema abstraction
- composite search filtering is not yet implemented
- some CSS remains global/cross-domain
- drawer back behavior is not a fully generic stack
- some shared/server Lidarr typing boundaries may still be imperfect

Avoid making these areas worse.

---

# Engineering / Agent Rules

Before implementation:

1. Inspect the existing code first.
2. Reuse current components and architecture.
3. Do not create duplicate abstractions.
4. Treat the current repository as implementation truth.
5. Check the current Git branch/status.
6. Do not assume old paths from historical discussions.

Prefer:

- small focused modules
- reusable components
- typed domain boundaries
- client API wrappers
- hooks for appropriate stateful orchestration
- server-side secrets
- safe public errors
- minimal dependency churn

Avoid:

- massive files
- god hooks/components
- Redux/Zustand/etc. without demonstrated need
- direct browser fetches scattered across UI
- provider-specific duplicated settings UIs when reusable infrastructure is appropriate
- unnecessary broad refactors during feature work
- dependency upgrades unrelated to the task

For substantial changes:

- run appropriate lint/build validation
- use Docker-based development validation
- summarize files changed
- report behavior changes explicitly
- do not commit/push/merge/rebase unless explicitly asked

---

# Git / Branching

Always inspect:

```bash
git status
git branch --show-current
```

before making assumptions.

Conceptual branch model:

```text
feature/* / refactor/*
→ PR into dev

dev
→ integration branch

main
→ production/release
```

Use squash merging when intermediate refactor/fix commits do not add useful long-term history.

---

# Immediate Next Milestone

The next major milestone is:

> **Finish the reusable Settings architecture. (if not already implemented)** 

Recommended progression:

1. Build/finish the reusable Settings shell/navigation.
2. Preserve/migrate the existing Lidarr settings behavior.
3. Add persisted Content / configurable MusicBrainz endpoint boundary.
4. Add Library source configuration.
5. Add Metadata provider configuration.
6. Add Artwork provider configuration.
7. Add Scheduled Tasks settings/infrastructure.
8. Implement Composite Search.
9. Add persistent Requests / real Library pages.
10. Revisit Prowlarr fallback only later.

This order may evolve, but Settings is currently the main product focus.

---

# Agent Handoff Guidance

When starting a fresh IDE/Codex session:

1. Read this file.
2. Read `AGENTS.md`.
3. Read `CLAUDE.md` if relevant.
4. Inspect the current repository tree.
5. Inspect current branch/status.
6. Treat repository code as source of truth.
7. Identify any contradictions between this document and current code.
8. Do not blindly preserve stale implementation details from this document if the code has legitimately evolved.

This file captures **product intent, architectural decisions, historical constraints, and near-term roadmap**.

It is not a substitute for inspecting the current implementation.
