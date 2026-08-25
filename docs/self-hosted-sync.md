# Self-hosted sync (optional)

## Status: working, deployed, running

This document tracks a feature that was built incrementally and is now
actually running: a real server, on a real container engine, surviving
real crashes and a real laptop reboot, syncing real data between a real
laptop and a real Android phone. It still reflects what actually exists,
not an idealized end state — update the checklist below as things change.

| Component | Status |
| --- | --- |
| SQLite schema + migrations (`users`, `sessions`, `exercises`) | ✅ built, tested (`server/src/db`) |
| Password hashing + admin CLI to create accounts | ✅ built, tested (`server/src/auth`, `server/src/cli`) |
| HTTP server: login/logout, session auth middleware | ✅ built, tested (`server/src/http`) |
| Sync endpoints for `exercises` (first vertical slice) | ✅ built, tested (`server/src/http/routes/sync.ts`) |
| Container packaging | ✅ built **and verified for real** — see "Running deployment" below. Built with `podman`, not `docker` (Docker Desktop isn't installed on the deployment machine; Podman is Docker-CLI-compatible and the existing `Dockerfile` needed zero changes) |
| Sync endpoints for the remaining four collections | ✅ built, tested (`server/src/db`, `server/src/http/routes/sync.ts`) |
| Client integration (`workout-buddy-flow` talks to the server) | ✅ built, verified two-device (see below) |
| Automatic background sync | ✅ built, verified (see "Client integration" below) |
| Survives process crash | ✅ verified — killed the server process with SIGKILL, systemd restarted it, data intact |
| Survives a full laptop reboot | ✅ verified — see "Running deployment" below |

## Why this exists

The core app (everything under `src/`) is unchanged by this: it is still
fully offline, works with zero setup, and stores everything in the browser's
IndexedDB. That default never goes away — this is an **opt-in extra**, not a
requirement.

What it adds: a way to use the same exercise/workout library and history
across more than one device (e.g. a laptop and a phone), without depending
on a third-party cloud provider. You run the server yourself — on a home
server, a NAS, a Raspberry Pi, or a small VPS — and it's reachable only by
accounts you create for yourself (see below). The privacy stance from
`docs/overview.md` ("no third-party server, no tracking") is preserved: the
server is *yours*, not a vendor's.

## Design decisions and why

- **Self-hosted via Docker, not a managed cloud platform.** No AWS/Azure
  APIs anywhere in this code, so it runs unmodified on any machine that can
  run Docker.
- **SQLite, not Postgres.** Single file, zero separate service to operate or
  patch, trivially backed up by copying the file. This is a personal-scale
  tool, not a multi-tenant SaaS; Postgres would be the "if this grows"
  upgrade, not a v1 requirement.
- **Multi-user with per-user isolation**, not a single shared login. Chosen
  because more than one person may want to run their own private library on
  the same self-hosted instance. Every synced table is keyed by
  `(id, userId)`, not `id` alone — see the "colliding id" test in
  `server/src/test/db.test.ts` for why that distinction matters.
- **Invite-only / admin-created accounts, no public signup endpoint.** A
  self-hosted server may end up reachable from the open internet; without a
  registration endpoint at all, there's no attack surface for automated
  account creation to defend against.
- **Opaque server-side sessions, not JWTs.** A session is a row in the
  `sessions` table. Logging out or rotating a password deletes/invalidates
  that row immediately — a JWT can't be revoked before it expires without
  extra infrastructure (a blocklist), which is unnecessary complexity here.
- **Sync is pull-since-timestamp + push, with last-write-wins per record —
  not a CRDT or field-level merge.** Every synced row has an `updatedAt`; a
  client asks "what changed since X" and pushes what it changed since X. On
  conflict, whichever write has the newer `updatedAt` wins outright, and the
  losing client is told what actually won so it can reconcile. This is a
  known, deliberate simplification: two devices editing the *same field* of
  the *same record* while both offline can lose one side's edit. Real
  per-field merge (or CRDTs) would remove that risk but is substantially
  more complex to build and reason about — not justified for a first
  version of a personal tool.
- **Deletes are tombstones (`deletedAt`), not hard deletes.** A row that
  simply disappears gives other devices no signal to remove it locally too.
  Soft-deleting reuses the exact same last-write-wins upsert path as any
  other edit — no separate delete code path to keep in sync with it.

## Container packaging (`server/Dockerfile`)

Multi-stage build on `node:22-slim` (Debian, not Alpine — better-sqlite3 is a
native addon, and prebuilt binaries are far more reliably available for
glibc than musl across the architectures self-hosters actually use: amd64
VPS, arm64 Raspberry Pi). Build stage compiles TypeScript and installs build
tools only as a fallback for when no prebuilt native binary matches;
runtime stage copies over the pruned `node_modules` and `dist`, runs as the
non-root `node` user. `HEALTHCHECK` (hitting `/health` via Node's built-in
`fetch`, no curl/wget needed) is written into the Dockerfile but is ignored
under Podman's default OCI image format — harmless; the app's own
`/health` endpoint still works for any external check.

Built and run with `podman`, not `docker` — Docker Desktop isn't installed
on the deployment machine, and Podman is close enough to Docker-CLI-compatible
that the `Dockerfile` needed zero changes. `server/docker-compose.yml`
exists but isn't what's actually running (no `docker compose`/`podman
compose` provider was available either) — the container was built and run
with plain `podman build` / `podman run` instead.

## Running deployment (verified for real, not just built)

This isn't hypothetical — it's the actual server your app is syncing
against. What's running and how it survives things:

- **Image**: `podman build -t workout-buddy-server .` from `server/`,
  verified to build clean end to end (this is what finally answered the
  earlier "never actually built" caveat).
- **Container**: `workout-buddy-server`, port 3000 published, data on a
  named volume (`workout-buddy-data`) so it outlives the container.
- **Process supervision**: a plain systemd unit
  (`/etc/systemd/system/workout-buddy-server.service` *inside the Podman
  machine's Linux VM* — reach it via `podman machine ssh`), `Restart=always`,
  enabled the normal way (`systemctl enable --now`). Verified by sending
  `SIGKILL` directly to the server process and confirming systemd relaunched
  it within seconds, data intact.
- **Survives a full laptop reboot**: verified by actually restarting the
  laptop, twice. Podman Desktop is a macOS login item, so it relaunches on
  its own after login, starts the Podman machine automatically, and systemd
  inside that machine brings the service back up with no manual steps.

**A real lesson from getting here — the first attempt failed and here's
why**: the first approach used a Podman **Quadlet** unit (a `.container`
file in `/etc/containers/systemd/`, the modern Podman-recommended pattern,
with `Restart=always` and `[Install] WantedBy=multi-user.target`). It
worked when started manually and survived a killed process fine. It did
**not** come back after an actual reboot, even though systemd's generator
correctly created the `.wants` symlinks at boot (confirmed by inspecting
them directly) — the unit was simply never activated, with no error logged
anywhere. Quadlet units are regenerated fresh from their source file on
every boot rather than persisted as real unit files, and in this
minimal Podman-machine VM that regeneration appears to race against target
activation in a way a plain systemd unit doesn't. The fix: a normal
`.service` file enabled the standard way (`systemctl enable`, which writes
a real, persistent symlink into `/etc/systemd/system/multi-user.target.wants/`
rather than relying on boot-time regeneration) — confirmed working across
two separate real reboots. If a future migration to Quadlet is worth
revisiting (it has real advantages — declarative, versionable alongside the
app), verify it survives an actual reboot before trusting it, not just a
manual `systemctl start`.

**Also found and fixed while getting the real devices talking to this
server** — worth knowing if you're reproducing this setup, not fixed *in*
this repo since they're environment-specific, not code bugs: a
same-machine port collision with an unrelated local app (Obsidian) also
listening on :3000 (harmless — only matters if you test via `localhost`
instead of the LAN address, which is what the phone needed anyway), and a
browser privacy/cookie-auto-clear extension silently wiping `localhost`'s
IndexedDB between test sessions on the laptop, which looked exactly like a
sync bug until traced to the extension.

## Server-side schema (`server/src/db/migrations/`)

Every synced table shares the same shape: `user_id`, `updated_at`
(the sync watermark), `deleted_at` (tombstone), and `PRIMARY KEY (id, user_id)`.
Nested arrays (`sets`, `workouts`, `actual_sets`) are stored as JSON text,
same treatment as `exercises.muscle_groups`.

```text
users               id, email, password_hash, created_at            (001)
sessions            token, user_id, created_at, expires_at          (001)
exercises           id, user_id, name, category, muscle_groups,
                    difficulty, image_url, updated_at, deleted_at   (001)
workouts            id, user_id, date, title, duration, category,
                    sets, rest_between_exercises, notes,
                    updated_at, deleted_at                         (002)
scheduled_workouts  id, user_id, workout_id, start_date, start_time,
                    end_time, recurrence, recurrence_day,
                    end_recurrence_date, notes, created_at,
                    updated_at, deleted_at                         (002)
courses             id, user_id, title, description, goal,
                    difficulty, prerequisites, duration_weeks,
                    workouts, created_at, started_at, completed_at,
                    updated_at, deleted_at                         (002)
workout_sessions    id, user_id, workout_id, date, title, duration,
                    category, sets, rest_between_exercises, notes,
                    completed_at, planned_duration, course_id,
                    course_item_id, scheduled_workout_id,
                    actual_sets, perceived_exertion,
                    completion_notes, updated_at, deleted_at       (002)
```

One subtlety worth calling out: `scheduled_workouts` and `courses` each
already have their own client-stamped `created_at`, separate from the
sync-layer `updated_at`. The upsert SQL for both deliberately excludes
`created_at` from its `ON CONFLICT ... DO UPDATE SET` clause, so a later
edit can never change when a record was originally created — verified in
`server/src/test/http-sync-scheduled-workouts.test.ts`.

## Running the server code so far

```sh
cd server
npm install
npm run create-user -- you@example.com   # prompts for a password
npm run dev                              # starts on :3000 (PORT / HOST to override)
npm test
npx tsc --noEmit
```

Endpoints that exist right now:

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `GET /health` | none | `{ status: 'ok' }` after a live DB check. Used by the Docker `HEALTHCHECK`. |
| `POST /auth/login` | none | `{ email, password }` → `{ token, expiresAt }`. Wrong password and unknown email get an identical 401 response, so a caller can't use this to enumerate registered emails. |
| `POST /auth/logout` | `Authorization: Bearer <token>` | Deletes the session row; the token is immediately unusable, not just expired. |
| `GET /sync/<collection>?since=<ISO timestamp>` | `Authorization: Bearer <token>` | Rows for the caller changed after `since` (all of them if omitted), plus `serverTime`. Includes soft-deleted rows. |
| `POST /sync/<collection>` | `Authorization: Bearer <token>` | `{ <collection>: [...] }`, up to 1000 per request, validated by JSON schema. Applies each with last-write-wins in one transaction and returns the post-merge state — a caller whose write lost a conflict gets told what actually won, not an echo of what it sent. |

`<collection>` is one of `exercises`, `workouts`, `scheduledWorkouts`,
`courses`, `workoutSessions` — all five now exist and share this exact
shape, registered through one generic factory
(`server/src/http/syncRoute.ts`) rather than five hand-written route pairs.
Only the DB-layer SQL stays explicit per table
(`server/src/db/{exercises,workouts,scheduledWorkouts,courses,workoutSessions}.ts`)
— deliberately not genericized, so each table's upsert logic stays directly
readable rather than generated from column config.

## Client integration (`src/lib/syncClient.ts`)

- `updatedAt` is now stamped on every create/update by
  `useIndexedDBCollection` (`src/hooks/useIndexedDBCollection.ts`)
  unconditionally, whether or not sync is configured — one change to the
  shared hook rather than five to each domain hook. Pre-existing records
  missing it get backfilled and persisted on their first sync.
- `syncAll()` pushes every local record for a collection (simpler than
  tracking a per-record dirty flag; the server's upsert is idempotent, so
  re-pushing unchanged rows is harmless at personal-library scale), saves
  back whatever the server says actually won each conflict, then pulls
  anything changed since the last watermark and merges it in.
- UI lives in `src/components/SyncSettingsModal.tsx`, reachable from
  Progress → ⚙️ → **Self-Hosted Sync**. Connect (server URL + email +
  password); once connected, sync happens automatically — **Sync now** is
  only for forcing it immediately rather than waiting for the next
  automatic pass.
- **Automatic sync** (`src/hooks/useAutoSync.ts`, mounted for the app's
  whole lifetime via `src/components/AutoSync.tsx` under `DataProvider` in
  `App.tsx` — not tied to any one page or the settings dialog, so it keeps
  running regardless of which route is open): runs `syncAll()` on app
  load, on an interval (every 30s, `SYNC_INTERVAL_MS`) while the app stays
  open, and immediately whenever the app/tab becomes visible again (covers
  "phone was backgrounded, foreground it" without waiting for the next
  tick). `isConnected()` is a synchronous localStorage check, so this costs
  nothing when sync was never configured — the default, still fully
  supported, offline-only case. Background failures (server temporarily
  unreachable) are logged and swallowed, not surfaced as user-facing
  errors — only the explicit **Sync now** button surfaces errors, since
  that's an in-the-moment action the user is watching. The "Last synced"
  time shown in the dialog is read from a persisted value
  (`getLastSyncedAt()`) rather than component state, so it reflects
  background syncs too, not just ones triggered while the dialog happened
  to be open. Verified with two automated checks: a page reload with zero
  clicks still syncs (tests the on-load path) and sitting idle for 35s
  produces a sync round within that window (tests the interval path).
- **Known gap:** local deletes are still hard deletes; they don't push a
  tombstone, so a record deleted on one device won't disappear from
  another after a sync. Creates and edits sync correctly.

### Three real bugs this surfaced (found by actually running it, not by review)

1. **The server had no CORS configuration at all.** A browser-based
   `fetch()` from the app to the sync server would have been blocked
   outright the first time anyone tried this. Fixed with `@fastify/cors`,
   `origin: true` — reasonable for a self-hosted server with no cookie
   session to protect (auth is a Bearer token the browser never attaches
   automatically, so CORS isn't the security boundary here; it just
   shouldn't block the app's own requests).
2. **Syncing silently appeared to do nothing.** Root cause: `useData()`'s
   `refreshSessions()` (part of the post-sync refresh) briefly sets
   `sessionsLoading` true→false. `Progress.tsx` renames that to
   `workoutsLoading` and early-returns a bare loading spinner while it's
   true — which unmounts the *entire page*, including the sync dialog that
   was still awaiting its own result, discarding its local state. Fixed at
   the root: `useIndexedDBCollection`'s `isLoading` now only fires on a
   collection's *first* load, not on every subsequent refresh — a refresh
   of already-loaded data has something to show throughout, so it
   shouldn't trigger a "nothing to show yet" spinner state in whatever
   page happens to be gating on it. This was found by driving two separate
   real browser sessions through the full login → create → sync → pull
   flow and watching it fail, not by reading the code.
3. **The most serious one: pushed records could permanently vanish from
   other devices' pulls.** `listChangedSince` filtered by `updated_at` —
   the *client's* edit timestamp — against `since`, which is a *server*
   timestamp a device captured at its last sync. These are different
   clocks. If device A edits a record at T1 but doesn't push until T3, and
   device B already synced (capturing watermark T2, T1 < T2 < T3) before
   that push happened, B's next pull (`WHERE updated_at > T2`) permanently
   excludes the record: its `updated_at` (T1) is before B's watermark, even
   though it only reached the server after B's last sync. This is not an
   edge case — it happens any time one device pushes later than another
   device's last sync, which is the ordinary case, not a rare one. Found
   this exact way, live: a workout pushed from a laptop never reached a
   phone that had synced (against an empty server) slightly earlier.
   Fixed in migration `003_synced_at.sql` — every table now has a
   `synced_at` column stamped with the *server's* clock at write time,
   independent of the client's `updated_at`, and `listChangedSince` filters
   by that instead. `updated_at` keeps its original, still-correct job:
   last-write-wins conflict resolution between two concurrent edits — a
   genuinely different question ("which edit is newer") from "when did
   this reach the server," and the bug was conflating the two. The
   migration also backfills `synced_at = updated_at` for pre-existing rows,
   since a fresh column defaults to `NULL` and `NULL > since` is never true
   in SQL — without the backfill, every row written before this fix would
   have silently dropped out of every future pull, for every device,
   permanently. Regression tests locking this in:
   `server/src/test/db.test.ts` ("a record shows up even if its updatedAt
   predates the watermark") and the equivalent in `http-sync.test.ts`.

### Android-specific requirement (two separate settings, both needed)

A self-hosted server on a home network is very often plain HTTP (no one's
provisioning a TLS certificate for a home server's LAN IP), which Android's
WebView blocks by default in two independent ways — both had to be fixed;
fixing only one still failed with "Failed to fetch" and no clearer error
until checked via `adb logcat`:

1. **OS-level cleartext block** (API 28+): `android/app/src/main/AndroidManifest.xml`
   sets `android:usesCleartextTraffic="true"` on `<application>`.
2. **Mixed content**: the app's own pages load from a virtual
   `https://localhost` origin; a fetch from there to a real `http://`
   target is "mixed content" and blocked separately from #1. Fixed in
   `capacitor.config.ts` via `android: { allowMixedContent: true } }` —
   **not** `server.cleartext` (that key exists too, and sounds right, but
   controls something else; it was tried first and, confirmed via logcat,
   did not stop the "Mixed Content: ... blocked" error).

Both are broad allows (any host, not just the configured sync server)
rather than a per-host `network_security_config.xml` allowlist — deliberate,
since the user can point the app at *any* server address they choose,
which a static allowlist can't accommodate without being regenerated per
server. Both are explicitly flagged "not intended for production" in
Capacitor's own docs; acceptable for a self-built, self-installed personal
app, not something to carry into anything distributed more broadly.

## Verified two-device, end to end — on real hardware, not just automation

Two separate browser profiles (simulating two devices, each with their own
IndexedDB) were driven through the full flow first: laptop creates a
workout → connects → syncs (pushes it) → phone connects → syncs (pulls
it) → workout appears. That caught bugs 1 and 2 above.

Then confirmed for real: an actual laptop browser and an actual Android
phone, over a home Wi-Fi network, syncing through the real server. This
caught bug 3 above — the automated two-browser test happened to push and
pull in an order that never triggered it, which is exactly why real usage
still matters even after automated coverage passes. Getting to that point
also meant working through, in order: USB debugging not prompting (phone
defaulted to charging-only USB mode), Android Studio's Gradle sync leaving
no run configuration (worked around by building and installing directly
via `./gradlew installDebug`, which doesn't depend on Android Studio's IDE
state), the two Android cleartext/mixed-content settings above, a
same-origin port collision with an unrelated local app (Obsidian) also
listening on :3000, a browser privacy extension silently clearing
`localhost`'s IndexedDB (wiping locally-created data between test runs,
initially indistinguishable from a sync bug), and finally bug 3 itself.

Then moved off a bare `tsx` process in a terminal window onto the real
deployment described in "Running deployment" above — verified with two
actual laptop reboots, not just reasoned about, including the Quadlet
false start documented there. The full loop — create on phone, background
auto-sync picks it up with no button press, appears on laptop, and vice
versa — is what's actually running as of this writing, not a one-time
demo.
