# Workout Buddy — Project Overview

## What this app is

Workout Buddy is an **offline-first personal training companion**. You build your own
exercise library, assemble exercises into workouts, plan those workouts on a calendar,
run them full-screen while you train, and follow multi-workout "courses" (programs)
from start to finish.

It is designed to run as a website *and* as an installable Android app (via Capacitor),
with all data stored on the device.

## Aims and ideas behind the project

1. **Local-first by default; no third-party cloud, ever.** Out of the box there is no
   login and no server — everything lives in the browser/WebView database (IndexedDB)
   on the user's own device, and the app works in airplane mode. An *optional*
   self-hosted sync server (see `docs/self-hosted-sync.md`) lets someone use their own
   library across their own devices, but it is infrastructure they run and control
   themselves — never a vendor's cloud, never third-party tracking.
2. **The user owns the content.** Instead of a fixed catalogue, the user creates and
   edits exercises (including photos taken from their phone), and composes them into
   workouts with their own sets, reps, durations and rest times.
3. **From planning to doing.** The three loops of training are all covered:
   *plan* (calendar, courses) → *do* (full-screen workout presentation with timers) →
   *review* (history, progress charts, streaks).
4. **Reliable during a real session.** Guided workouts use absolute deadlines so
   timers catch up after backgrounding, request a screen wake lock, and persist the
   active step locally for resume after interruption.
5. **Mobile first, native-capable.** Layouts work on a phone screen, and the whole app
   can be wrapped by Capacitor into an APK without changing the data layer.
6. **Simple, boring architecture.** Plain React + hooks + one context. No state
   machine libraries, no server sync logic. Easy to read and easy to change.
7. **Correctable and accessible.** Mistaken history and calendar actions can be
   corrected without rebuilding a program. Device-level large text, reduced motion,
   voice and haptic preferences keep guided sessions usable in varied environments.

## Core concepts

| Concept | Meaning |
| --- | --- |
| **Exercise** | A single movement (Bench Press, Plank). Has a category, muscle groups, difficulty and optional image. |
| **Set** | One block of work for an exercise inside a workout: reps + weight, or duration/distance, plus rest after. |
| **Workout** | A reusable, named and ordered collection of planned sets. |
| **Workout Session** | An immutable completion record created by guided mode, including actual elapsed time and optional course/calendar links. |
| **Scheduled Workout** | A workout placed on a date/time in the calendar, optionally recurring daily or on a weekday. |
| **Course** | A week/day program of repeatable workout sessions and recovery days, with goals, difficulty, prerequisites and per-day instructions. |

## The main user journeys

```text
Exercises page   ->  create / edit / delete exercises (with photo upload)
       |
       v
Create Workout   ->  pick exercises, set sets x reps or duration, rest times
       |
       +--> Calendar  ->  schedule it on a day/time, optionally recurring
       |
       +--> Courses   ->  arrange repeatable workouts/recovery by week and day
       |                   -> schedule the entire program from one start date
       |
       v
Workout Detail   ->  review the plan, edit or delete it
       |
       v
Start Workout    ->  full-screen guided run preserving authored set order
       |
       v
Workout Session  ->  snapshot actual completion and elapsed time
       |
       v
History / Progress -> filter completed sessions, see streaks/charts, clear history
```

## Non-goals

- No social feed, sharing between unrelated users, or trainer/client relationships.
- No third-party cloud provider or vendor lock-in — self-hosted sync (in progress; see
  `docs/self-hosted-sync.md`) is deliberately Docker + SQLite, deployable to anything
  from a Raspberry Pi to a small VPS, with no managed-cloud APIs involved.
- No wearable / health-platform integration.
- No public account self-signup on the sync server — accounts are admin-created only.
- Manual JSON backup and restore remain available from Settings regardless of
  whether sync is set up; they're the simplest path and require no server at all.
