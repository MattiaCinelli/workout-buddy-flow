# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versioning covers the app in `src/` and the optional sync server in `server/`
together — a single tag `vX.Y.Z` releases both.

## [Unreleased]

### Added

- **Explicit course-day sequencing** — selecting days 1–5 creates a workout on
  each selected day without inventing rest-day entries. Multiple workouts can
  share one course day in a clear order, are placed consecutively on the
  calendar, and completing one opens the next same-day workout automatically.
- **Directional exercise sets** — exercises can define left, right, forward and
  backward defaults. Adding one to a workout creates a separate, visible set for
  every selected direction, and each set's direction can be changed independently
  in the workout builder or editor. The guided workout displays and announces the
  active direction. Existing unilateral exercises and workouts remain compatible.

### Fixed

- **Workout exercise selection flow** — adding an exercise while creating a
  workout now keeps the Exercise Library open so several exercises can be added
  without repeatedly switching tabs.
- **One-limb exercise sync** — the sync server now persists the unilateral setting
  instead of dropping it and clearing the toggle on the next pull. Additive SQLite
  migrations preserve all existing exercises, workouts and history.

## [1.0.0] - 2026-09-02

First release. The app was usable and offline-capable throughout development; this is
the point where the scope in `docs/overview.md` is complete, verified on the web and on
a real Android device, and cut from a repeatable signed build.

### Added — core app (offline, no account required)

- **Exercise library** — create, edit and delete exercises with category, editable
  muscle-group tags, difficulty, a photo taken on the device, and an optional
  `https://` link to a demonstration video. Library cards are tinted by category for
  quick scanning.
- **One-limb-at-a-time exercises** — an exercise can be marked unilateral; the guided
  run then splits every set into a left side, a short switch pause, and a right side,
  and the builder shows each authored set as covering both sides.
- **Workout builder** — ordered sets of reps/weight or duration/distance with per-set
  rest, sensible defaults per exercise type, warm-up and AMRAP set flags, and preserved
  circuit/superset order.
- **Guided workout mode** — full-screen run with deadline-based timers that catch up
  after backgrounding, a screen wake lock, resume-after-interruption, and a completion
  chime. Optional spoken and haptic cues, with distinct prompts for switching sides,
  resting between sets, and changing exercise (the next exercise is named aloud).
  Optional background audio: a generated ambient bed or a user-supplied track.
- **Calendar** — weekly and monthly views; one-off, daily, or weekly multi-day
  recurring schedules; skip and restore individual occurrences; move a single
  occurrence without disturbing the series.
- **Courses** — week/day programs of repeatable workouts and recovery days with goals,
  difficulty, prerequisites and per-session notes; schedule an entire program from one
  start date; progress, next-session and restart tracking.
- **History & progress** — filterable completed-session history, streaks, weekly goal,
  charts, personal records, per-exercise progression suggestions, and a clear-history
  reset.
- **Body metrics** — dated body-weight log with BMI (height set once in settings).
- **Corrections** — edit or delete mistaken history records, undo a just-saved
  completion, and correct a session's details.
- **Accessibility** — large-text and reduced-motion preferences, voice and haptic
  toggles, screen-reader status announcements, phone-safe controls.
- **Light / dark / system theme.**
- **Backup & restore** — full-device JSON export/import (device preferences and the
  custom audio track included). Share a single exercise or workout as a self-contained
  file that merges into another library, remapping ids and reusing same-named entries.
- **Reminders** — local notifications for scheduled workouts with a configurable lead
  time (installed Android app).
- **PWA** — build-time-precached offline shell, installable, "update available" prompt
  rather than a silent swap.
- **Android app** — same build wrapped with Capacitor; signed APKs published to GitHub
  Releases on each `vX.Y.Z` tag, installing as data-preserving updates.

### Added — optional self-hosted sync server (`server/`)

- Node + Fastify + SQLite, packaged as an OCI container (built and run with Podman; the
  `Dockerfile` also works with Docker). No managed-cloud APIs.
- **Accounts are admin-created only** — no public signup endpoint. Passwords hashed
  with scrypt; sessions are opaque tokens stored only as a SHA-256 hash.
- **Sync** for all seven collections plus account-level settings (theme, accessibility,
  height). Pull-since-timestamp + push with last-write-wins per record; deletes are
  tombstones.
- **Automatic background sync** on app load, every 30s while open, and on return to the
  foreground, with exponential backoff after failures.
- **Conflict visibility** — a losing local edit is kept and can be re-applied from the
  Sync settings ("Keep mine" / "Dismiss").
- **Manual one-way sync** — "Push this device to server" and "Replace this device with
  server" overrides for when the automatic merge would do the wrong thing.
- **Self-service account management** — change display name, email or password; see how
  many other devices are connected and sign them all out; delete the account and all
  its server-side data (local data is untouched).
- **Admin password recovery** — `npm run reset-password -- <email>` on the server
  (there is no email/SMTP dependency by design).

### Security & privacy

- No third-party runtime code and no telemetry; the only outbound requests are to a
  sync server the user configures. The Lovable editor script is stripped from every
  production build.
- Imported backup/share files are validated per-record (Zod); `imageUrl` is restricted
  to `https:` or an `image/*` data URI and exercise `videoUrl` to a plain `https:`
  link; oversized files are rejected; CSV export escapes formula-injection characters.

### Known limitations

- Sync conflict resolution is whole-record last-write-wins, not field-level merge: two
  devices editing the _same field_ of the _same record_ while both offline can lose one
  side's edit. The losing edit is surfaced for manual recovery rather than silently
  dropped. Field-level merge / CRDTs are deliberately out of scope for 1.0.
- Plain-HTTP sync (a LAN server without TLS) is off by default in the Android build and
  must be enabled at build time (`WB_ALLOW_INSECURE_SYNC=1`); the token and data travel
  unencrypted on that network. Prefer an HTTPS sync server.

[Unreleased]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MattiaCinelli/workout-buddy-flow/releases/tag/v1.0.0
