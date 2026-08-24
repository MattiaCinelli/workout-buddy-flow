# Workout Buddy

An offline-first personal training app: build your own exercise library, compose
workouts, plan them on a calendar, run them full-screen while you train, and follow
multi-workout courses — all without an account, a server, or an internet connection.

Runs in the browser and packages into an installable Android app with Capacitor.

## Features

- **Exercise library** — create, edit and delete exercises with category, muscle
  groups, difficulty and a photo from your device.
- **Workout builder** — pick exercises and set sets × reps, weight, duration, distance
  and rest times, with sensible defaults per exercise type.
- **Guided workout mode** — full-screen player that walks you through every set and
  rest period with timers, pause/skip and a progress bar.
- **Calendar** — weekly and monthly views, scheduling with time slots and daily/weekly
  recurrence.
- **Courses** — chain workouts into a progression; complete one to unlock the next,
  restart at any time.
- **History & progress** — filterable session history, streaks, weekly goal and charts,
  plus a "clear all history" reset.
- **Light & dark themes.**

## Quick start

```sh
npm install
npm run dev
```

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
