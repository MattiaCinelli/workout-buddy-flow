# Workout Buddy

An offline-first personal training app for creating workouts and structured training
programs, scheduling them, following guided sessions, and reviewing real completion
history — without an account, server, or internet connection.

Runs in the browser and packages into an installable Android app with Capacitor.

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
npm run test:e2e
```

The first browser-test run may require `npx playwright install chromium`.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/overview.md](docs/overview.md) | What the project is, the aims and ideas behind it, core concepts, user journeys |
| [docs/architecture.md](docs/architecture.md) | Stack, layering, state management, routing, styling rules |
| [docs/data-model.md](docs/data-model.md) | Every entity, field by field, and why it is shaped that way |
| [docs/development.md](docs/development.md) | Project layout, how to add features, conventions, Android packaging |

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · React Router · IndexedDB
(via `idb`) · date-fns · Recharts · Capacitor

## Data & privacy

There is no backend and no login. All data is stored in an IndexedDB database
(`workout-buddy-db`) on the user's own device and never leaves it.

This also means there is currently no cloud sync or built-in backup. Clearing site/app
storage or uninstalling the Android app can remove locally stored data.

## Scope

Workout Buddy is designed for a person creating and following programs on one device.
It does not currently provide trainer/client accounts, remote assignments, sharing,
wearable integrations, or cross-device synchronization.
