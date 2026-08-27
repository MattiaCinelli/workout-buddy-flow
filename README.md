# Workout Buddy

An offline-first personal training app for creating workouts and structured training
programs, scheduling them, following guided sessions, and reviewing real completion
history — without requiring an account, server, or internet connection. An optional,
self-hosted sync server (see below) lets it work across more than one device without
depending on any third-party cloud.

Runs in the browser and packages into an installable Android app with Capacitor.

## Install on Android

Download the APK from the [latest GitHub Release](https://github.com/MattiaCinelli/workout-buddy-flow/releases/latest),
open it on your Android phone, and approve **Install unknown apps** if Android asks.
The APK is the installer; no server or account is required.

Android may show a warning because the app is downloaded outside Google Play. Only
install APKs published by this repository. Future releases install as updates and
retain local app data, provided they use the same signing key. Making a JSON backup
from Settings before an update is still recommended.

## Features

- **Exercise library** — create, edit and delete exercises with category, muscle
  groups, difficulty and a photo from your device.
- **Workout builder** — pick exercises and set sets × reps, weight, duration, distance
  and rest times, with sensible defaults per exercise type.
- **Guided workout mode** — preserves authored circuit/superset order, walks through
  sets and rest periods, and records an immutable session on completion.
- **Calendar** — weekly and monthly views, scheduling with time slots and daily/weekly
  recurrence.
- **Structured courses** — organize repeatable workouts and recovery days by week/day,
  with goals, difficulty, prerequisites and per-session guidance.
- **Course scheduling** — place every workout in a course onto the calendar from one
  program start date.
- **History & progress** — filterable session history, streaks, weekly goal and charts,
  plus a "clear all history" reset.
- **Mobile reliability** — resumable guided workouts, deadline-based timers, screen
  wake lock, local reminders and JSON backup/restore.
- **Performance logging** — record actual sets, skipped work, perceived exertion and
  post-session notes.
- **Corrections and recovery** — edit or remove mistaken history records, undo a
  just-saved completion, and skip, restore or move individual calendar occurrences.
- **Accessible training** — large-text and reduced-motion preferences, optional voice
  and haptic cues, screen-reader status announcements and phone-safe workout controls.
- **Light & dark themes.**

## Quick start

Requirements: **Node.js 22 LTS** (includes npm).

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Useful verification commands:

```sh
npm run lint
npm run build
npm run test:unit       # Vitest unit/hook tests
npm run test:coverage   # the same, with a coverage report (coverage/)
npm run test:e2e        # Playwright; boots the app + a throwaway sync server
```

The first browser-test run may require `npx playwright install chromium`.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/overview.md](docs/overview.md) | What the project is, the aims and ideas behind it, core concepts, user journeys |
| [docs/architecture.md](docs/architecture.md) | Stack, layering, state management, routing, styling rules |
| [docs/data-model.md](docs/data-model.md) | Every entity, field by field, and why it is shaped that way |
| [docs/development.md](docs/development.md) | Project layout, how to add features, conventions, Android packaging |
| [docs/self-hosted-sync.md](docs/self-hosted-sync.md) | Optional self-hosted sync server: status, design decisions, schema, deployment |
| [CHANGELOG.md](CHANGELOG.md) | Release history, following Keep a Changelog + SemVer |

## Tech stack

**App** (`src/`): React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · React
Router · IndexedDB (via `idb`) · date-fns · Recharts · Capacitor

**Sync server** (`server/`, optional): Node.js · TypeScript · better-sqlite3 ·
Fastify — see [docs/self-hosted-sync.md](docs/self-hosted-sync.md).

## Data & privacy

By default there is no backend and no login. All data is stored in an IndexedDB
database (`workout-buddy-db`) on the user's own device and never leaves it. Clearing
site/app storage or uninstalling the Android app can remove locally stored data —
manual JSON backup/restore (Settings) is the safety net.

A self-hosted sync server (`server/` — see
[docs/self-hosted-sync.md](docs/self-hosted-sync.md)) is available for anyone who wants
their library on more than one device, syncing automatically in the background. It is
opt-in, and it is *self*-hosted: no third-party cloud provider, no vendor account, no
tracking. Accounts on it are admin-created only — there is no public signup — and it
runs as an OCI container (built and run with Podman; the `Dockerfile` works with Docker
too) anywhere that can host one — a home server, a NAS, a Raspberry Pi, a small VPS —
never a managed cloud platform.

## Scope

Workout Buddy is designed for a person creating and following programs, optionally
across their own devices via self-hosted sync. It does not provide trainer/client
accounts, remote assignments, sharing between unrelated users, or wearable
integrations.
