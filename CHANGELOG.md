# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versioning covers the app in `src/` and the optional sync server in `server/`
together — a single tag `vX.Y.Z` releases both.

## [Unreleased]

_Nothing yet._

## [1.0.0] - 2026-08-27

First tagged release. The app has been usable and offline-capable throughout
development; this marks the point where the scope in `docs/overview.md` is
complete, verified on the web and on a real Android device, and cut from a
repeatable signed release.

### Added — core app (offline, no account required)

- **Exercise library** — create, edit and delete exercises with category,
  editable muscle-group tags, difficulty and a photo taken on the device.
- **Workout builder** — ordered sets of reps/weight or duration/distance with
  per-set rest, sensible defaults per exercise type, and preserved
  circuit/superset order.
- **Guided workout mode** — full-screen run with deadline-based timers that
  catch up after backgrounding, a screen wake lock, resume-after-interruption,
  optional voice and haptic cues, and optional background audio (a generated
  ambient bed or a user-supplied track).
- **Calendar** — weekly and monthly views; one-off, daily, or weekly
  multi-day recurring schedules; skip and restore individual occurrences.
- **Courses** — week/day programs of repeatable workouts and recovery days
  with goals, difficulty, prerequisites and per-session notes; schedule an
  entire program from one start date; progress, next-session and restart
  tracking.
- **History & progress** — filterable completed-session history, streaks,
  weekly goal, charts, personal records, and a clear-history reset.
- **Body metrics** — dated body-weight log with BMI (height set once in
  settings).
- **Corrections** — edit or delete mistaken history records, undo a
  just-saved completion, and correct a session's details.
- **Accessibility** — large-text and reduced-motion preferences, voice and
  haptic toggles, screen-reader status announcements, phone-safe controls.
- **Light / dark / system theme.**
- **Backup & restore** — full-device JSON export/import (device preferences
  and the custom audio track included; v1/v2 files still restore). Share a
  single exercise or workout as a self-contained file that merges into
  another library, remapping ids and reusing same-named entries.
- **Reminders** — local notifications for scheduled workouts with a
  configurable lead time (installed Android app).
- **PWA** — build-time-precached offline shell, installable, "update
  available" prompt rather than a silent swap.
- **Android app** — same build wrapped with Capacitor; signed APKs published
  to GitHub Releases on each `vX.Y.Z` tag, installing as data-preserving
  updates.

### Added — optional self-hosted sync server (`server/`)

- Node + Fastify + SQLite, packaged as an OCI container (built and run with
  Podman; the `Dockerfile` also works with Docker). No managed-cloud APIs.
- **Accounts are admin-created only** — no public signup endpoint. Passwords
  hashed with scrypt; sessions are opaque tokens stored only as a SHA-256
  hash.
- **Sync** for all seven collections plus account-level settings (theme,
  accessibility, height). Pull-since-timestamp + push with last-write-wins
  per record; deletes are tombstones.
- **Automatic background sync** on app load, every 30s while open, and on
  return to the foreground, with exponential backoff after failures.
- **Conflict visibility** — a losing local edit is kept and can be
  re-applied from the Sync settings ("Keep mine" / "Dismiss").
- **Manual one-way sync** — "Push this device to server" and "Replace this
  device with server" overrides for when the automatic merge would do the
  wrong thing.
- **Self-service account management** — change display name, email or
  password; see how many other devices are connected and sign them all out;
  delete the account and all its server-side data (local data is untouched).
- **Admin password recovery** — `npm run reset-password -- <email>` on the
  server (there is no email/SMTP dependency by design).

### Security & privacy

- No third-party runtime code and no telemetry; the only outbound requests
  are to a sync server the user configures. The Lovable editor script is
  stripped from every production build.
- Imported backup/share files are validated per-record (Zod), `imageUrl` is
  restricted to `https:` or an `image/*` data URI, oversized files are
  rejected, and CSV export escapes formula-injection characters.

### Known limitations

- Sync conflict resolution is whole-record last-write-wins, not field-level
  merge: two devices editing the *same field* of the *same record* while
  both offline can lose one side's edit. The losing edit is surfaced for
  manual recovery rather than silently dropped. Field-level merge / CRDTs
  are deliberately out of scope for 1.0.
- Plain-HTTP sync (a LAN server without TLS) is off by default in the
  Android build and must be enabled at build time
  (`WB_ALLOW_INSECURE_SYNC=1`); the token and data travel unencrypted on
  that network. Prefer an HTTPS sync server.

[Unreleased]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MattiaCinelli/workout-buddy-flow/releases/tag/v1.0.0
