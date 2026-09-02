# Workout Buddy — a complete teaching guide (beginner → advanced)

This document teaches you **how this app is built, how to run it, how to change it, and
how to keep building on it** — starting from very little assumed knowledge and ending
with the advanced parts (offline sync, native packaging, CI/CD, and how to keep working
with an LLM the way this codebase was originally created).

It is deliberately long. Read it top to bottom once, then use it as a reference. Every
section ends with a **"Try it"** exercise so you learn by doing.

> The other files in `docs/` are *reference* material (precise, terse). **This file is
> the tutorial** (explains the "why", assumes less). When they disagree on a number,
> trust the source code — this project changes faster than prose.

---

## Table of contents

**Part I — Orientation**
1. [What kind of app is this?](#1-what-kind-of-app-is-this)
2. [The mental model in one picture](#2-the-mental-model-in-one-picture)
3. [The toolbox: every technology, explained](#3-the-toolbox-every-technology-explained)

**Part II — Getting it running**
4. [Set up your machine](#4-set-up-your-machine)
5. [Run, build, test — the command cheat-sheet](#5-run-build-test--the-command-cheat-sheet)
6. [A guided tour of the repository](#6-a-guided-tour-of-the-repository)

**Part III — How the app works**
7. [React in 15 minutes (the parts this app uses)](#7-react-in-15-minutes-the-parts-this-app-uses)
8. [The architecture: layers and data flow](#8-the-architecture-layers-and-data-flow)
9. [The persistence layer: IndexedDB via `idb`](#9-the-persistence-layer-indexeddb-via-idb)
10. [The generic collection hook (the heart of the app)](#10-the-generic-collection-hook-the-heart-of-the-app)
11. [The data model, entity by entity](#11-the-data-model-entity-by-entity)
12. [Routing and pages](#12-routing-and-pages)
13. [Styling, theming, and the design tokens](#13-styling-theming-and-the-design-tokens)
14. [Forms and validation](#14-forms-and-validation)

**Part IV — Deep dives**
15. [The guided workout runtime](#15-the-guided-workout-runtime)
16. [The calendar and recurrence expansion](#16-the-calendar-and-recurrence-expansion)
17. [Seeding and seed migrations](#17-seeding-and-seed-migrations)
18. [Referential integrity (why some deletes are blocked)](#18-referential-integrity-why-some-deletes-are-blocked)
19. [Backup / restore and the import schemas](#19-backup--restore-and-the-import-schemas)
20. [Progressive Web App: offline and updates](#20-progressive-web-app-offline-and-updates)
21. [Accessibility and the guided-session cues](#21-accessibility-and-the-guided-session-cues)

**Part V — Changing the app**
22. [Recipe: add a field to an existing entity](#22-recipe-add-a-field-to-an-existing-entity)
23. [Recipe: add a whole new entity / object store](#23-recipe-add-a-whole-new-entity--object-store)
24. [Recipe: add a new page](#24-recipe-add-a-new-page)
25. [Recipe: add or restyle a UI component](#25-recipe-add-or-restyle-a-ui-component)
26. [Testing your changes](#26-testing-your-changes)

**Part VI — Advanced**
27. [The optional self-hosted sync server](#27-the-optional-self-hosted-sync-server)
28. [Soft delete and last-write-wins sync](#28-soft-delete-and-last-write-wins-sync)
29. [Packaging as an Android app with Capacitor](#29-packaging-as-an-android-app-with-capacitor)
30. [CI/CD and releases](#30-cicd-and-releases)

**Part VII — Working the way this app was made**
31. [This app was built with an LLM — how to keep doing that well](#31-this-app-was-built-with-an-llm--how-to-keep-doing-that-well)
32. [A learning path: 3 months from here](#32-a-learning-path-3-months-from-here)
33. [Glossary](#33-glossary)
34. [Troubleshooting index](#34-troubleshooting-index)

---

# Part I — Orientation

## 1. What kind of app is this?

Workout Buddy is a **single-page web application (SPA)** that also ships as an
**installable Android app**. Concretely:

- **Single-page app** — the browser loads one HTML file (`index.html`) and one bundle
  of JavaScript. After that, navigating between "Exercises", "Calendar", "History" etc.
  never reloads the page; JavaScript swaps what's on screen. This is what **React** +
  **React Router** give you.
- **Local-first / offline-first** — there is **no backend and no login by default**.
  Every exercise, workout, schedule and history record is stored in a database that
  lives *inside the browser* on your device, called **IndexedDB**. The app works in
  airplane mode.
- **Progressive Web App (PWA)** — the web build includes a *service worker* that caches
  the whole app so a second visit works with no network at all, and can be "installed"
  to a phone home screen.
- **Native-capable** — **Capacitor** wraps the exact same web build in a thin Android
  shell (a full-screen WebView + a few native plugins for notifications, file sharing,
  haptics and text-to-speech), producing an `.apk` you can install.
- **Optionally syncable** — there is a *separate, optional* Node.js server in `server/`
  that you can self-host to sync one person's data across their own devices. It is not
  required and not used unless you configure it in Settings.

Nothing about the app is unusual or exotic. The stated design goal (see
`docs/overview.md`) is **"simple, boring architecture"**: plain React, plain hooks, one
context, no state-machine library, no data-fetching library. That is exactly what makes
it a good codebase to learn from.

### Why "local-first" matters to how the code is shaped

In a "normal" web app, the source of truth is a server database and the browser is a
dumb view of it. Here the **browser is the source of truth**. So the code you would
normally expect to be on a server — validating data, enforcing that you can't delete an
exercise that a workout still uses, expanding a "every Monday" rule into actual calendar
dates — all lives in the front-end, in `src/lib/` and `src/hooks/`. That's a feature:
you can read the entire system in one repository, in one language (TypeScript).

**Try it:** open the app in a browser (see Part II), then open your browser's
DevTools → Application → IndexedDB → `workout-buddy-db`. You are looking at the actual
database. Every store you see there maps to a file in `src/data/`.

---

## 2. The mental model in one picture

```text
        ┌──────────────────────────────────────────────────────────────┐
        │                        The browser tab                        │
        │                                                              │
        │   React components  (what you see: pages, buttons, modals)    │
        │        │  read state / call functions                        │
        │        ▼                                                      │
        │   useData()  ──►  DataContext   (one object, whole-app state) │
        │        │                                                      │
        │        ▼                                                      │
        │   Domain hooks   useExercises / useWorkouts / useCourses /…   │
        │        │   (each owns one in-memory array + its operations)   │
        │        ▼                                                      │
        │   useIndexedDBCollection   (generic load/create/update/…)     │
        │        │                                                      │
        │        ▼                                                      │
        │   src/lib/db.ts   (typed wrappers around IndexedDB calls)     │
        │        │                                                      │
        │        ▼                                                      │
        │   IndexedDB  "workout-buddy-db"   ← the data actually lives here
        └──────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ (optional, only if you turn it on)
                    ┌────────────┴─────────────┐
                    │  Self-hosted sync server │  Node + Fastify + SQLite
                    │       (server/)          │
                    └──────────────────────────┘
```

Read that top to bottom: **components** never talk to the database directly. They call
`useData()`, which hands them arrays and functions. Those come from **domain hooks**,
which are all thin wrappers over one **generic hook**, which calls **`db.ts`**, which
calls **IndexedDB**.

Every write goes **down** the stack (component → hook → db → IndexedDB) and then the
hook updates its in-memory copy so React re-renders. Every read is just "use the array
the hook already loaded".

Hold onto this picture. Sections 8–10 walk each layer in detail.

---

## 3. The toolbox: every technology, explained

You do not need to know all of these before starting. This is a map so that when you
see a name in the code you know what it is and where to learn more.

### Language & runtime

| Tool | What it is | Why it's here |
| --- | --- | --- |
| **JavaScript** | The language browsers run. | Everything ultimately compiles to it. |
| **TypeScript** | JavaScript **plus a type system**. Files end `.ts` / `.tsx`. Types are checked at build time and then erased — the browser never sees them. | Catches "you passed a string where a number was expected" before you run the code. The whole app and server are TypeScript. |
| **Node.js 22 LTS** | JavaScript running *outside* a browser — on your machine. | Runs the build tool, the tests, the linter, and (optionally) the sync server. You install it once. |
| **npm** | Node's package manager (ships with Node). Reads `package.json`, downloads dependencies into `node_modules/`, runs scripts. | `npm install`, `npm run dev`, etc. |

### Build & dev tooling

| Tool | What it is | Where |
| --- | --- | --- |
| **Vite** | The dev server and bundler. In dev it serves your source files instantly with hot-reload; for production it bundles everything into a small set of optimized files in `dist/`. | `vite.config.ts`, `npm run dev`, `npm run build` |
| **@vitejs/plugin-react-swc** | Teaches Vite to compile React/JSX (using SWC, a very fast Rust compiler). | `vite.config.ts` |
| **ESLint** | The linter — flags likely mistakes and style violations. | `eslint.config.js`, `npm run lint` |
| **vite-plugin-pwa** + **Workbox** | Generates the service worker and web app manifest that make the web build installable and offline-capable. | `vite.config.ts`, `src/components/PwaUpdatePrompt.tsx` |
| **lovable-tagger** / `cdn.gpteng.co` script | Hooks for the **Lovable** in-browser AI editor this project was originally built in. **Stripped from every production build** by a plugin in `vite.config.ts` — it only exists during `vite` dev. | `vite.config.ts` (`stripLovableEditorScript`) |

### The UI stack

| Tool | What it is | Why |
| --- | --- | --- |
| **React 18** | A library for building UIs out of **components** — functions that return markup. React re-renders a component when its data changes. | The entire front-end. |
| **React Router (v7)** | Maps URLs (`/calendar`, `/workouts/:id`) to components. | `src/App.tsx` |
| **Tailwind CSS** | A styling system where you compose utility classes in your markup (`className="flex items-center gap-2 p-4"`) instead of writing separate CSS files. | `tailwind.config.ts`, every component |
| **shadcn/ui** | Not a dependency you install — a *collection of component source files* (button, dialog, select…) **copied into `src/components/ui/`** so you own and can edit them. Built on Radix. | `src/components/ui/*`, `components.json` |
| **Radix UI** | Unstyled, fully-accessible component primitives (the behaviour of a dropdown, a dialog's focus trap, etc.). shadcn/ui adds the Tailwind styling. | `@radix-ui/*` in `package.json` |
| **lucide-react** | The icon set (`<Dumbbell />`, `<Calendar />`). | Everywhere in the UI |
| **class-variance-authority**, **clsx**, **tailwind-merge** | Small helpers for building conditional `className` strings without conflicts. `cn()` in `src/lib/utils.ts` wraps them. | `src/components/ui/*` |
| **next-themes** | Light/dark theme switching (despite the name, it works fine outside Next.js). | `src/hooks/useTheme.ts`, `ThemeToggle.tsx` |
| **sonner** / **`ui/toast`** | Toast notifications ("Workout saved"). | `App.tsx` mounts both |

### Data, forms, dates, charts

| Tool | What it is | Why |
| --- | --- | --- |
| **idb** | A tiny Promise-based wrapper over the raw IndexedDB API (which is famously awkward). | `src/lib/db.ts` |
| **react-hook-form** + **@hookform/resolvers** | Manages form state (values, touched, errors) efficiently. | Create/edit modals |
| **zod** | A schema/validation library. You describe the shape of data once; zod both **validates** at runtime and **infers the TypeScript type**. | `src/lib/importSchemas.ts` (validating imported backups), forms |
| **date-fns (v3)** | Date maths done with plain functions (`addDays`, `isSameDay`, `format`). No global "moment" object. | Calendar, recurrence, streaks. Split into its own bundle chunk. |
| **Recharts** | React charting library. | Progress screens. **Lazy-loaded** — it's the biggest dependency, so it only downloads when you open a chart page. |

### Native packaging

| Tool | What it is |
| --- | --- |
| **Capacitor (v8)** | Wraps a web build as a native iOS/Android app. Here: Android only. `capacitor.config.ts` points it at `dist/`. |
| **@capacitor/local-notifications** | Schedules the workout reminder notifications. |
| **@capacitor/filesystem**, **@capacitor/share** | Writing a backup file and opening the Android share sheet. |
| **@capacitor/haptics**, **@capacitor-community/text-to-speech** | Vibration and spoken cues during a guided workout. |

### Testing & CI

| Tool | What it is | Command |
| --- | --- | --- |
| **Vitest** | Unit + hook test runner (Vite-native, Jest-compatible API). | `npm run test:unit` |
| **@testing-library/react** | Renders components/hooks in tests and queries them the way a user would. | used inside `*.test.tsx` |
| **fake-indexeddb** | An in-memory IndexedDB for tests that touch `db.ts`. | `import 'fake-indexeddb/auto'` |
| **Playwright** | End-to-end tests: drives a real Chromium browser against the built app. | `npm run test:e2e` |
| **GitHub Actions** | CI: runs lint + types + unit + build + e2e on every PR, and builds a signed APK on version tags. | `.github/workflows/` |

### The optional server

| Tool | What it is |
| --- | --- |
| **Fastify** | A small, fast Node HTTP framework. The sync API. |
| **better-sqlite3** | A synchronous SQLite driver. The server's database is a single `.sqlite` file. |
| **node:test** via **tsx** | The server's test runner (Node's built-in test framework; `tsx` runs TypeScript directly). |
| **Podman / Docker** | The server ships as an OCI container image (`server/Dockerfile`). |

**Try it:** open `package.json`. Every name in the tables above is in `dependencies` or
`devDependencies`. `dependencies` = shipped to users; `devDependencies` = only used to
build and test. Notice how small `dependencies` actually is once you discount the
`@radix-ui/*` primitives.

---

# Part II — Getting it running

## 4. Set up your machine

You need **three** things for the web app:

1. **Node.js 22 LTS.** Download from [nodejs.org](https://nodejs.org/) or use a version
   manager (`nvm`, `fnm`, `volta`). Verify:
   ```sh
   node --version   # should print v22.x
   npm --version
   ```
2. **A terminal.** macOS Terminal / iTerm, Windows Terminal (with WSL is nicest), or
   your editor's built-in terminal.
3. **An editor.** VS Code is the common choice; it understands TypeScript out of the
   box. The repo has a `.idea/` folder too, so JetBrains WebStorm works well.

For the **Android build** you additionally need Android Studio, the Android SDK
(Build-Tools 35.0.0), and Java 21 — covered in Section 29, not needed to start.

For the **sync server** you only need Node (same version). SQLite is bundled by
`better-sqlite3`.

### First run

```sh
git clone <this repo>
cd workout-buddy-flow
npm install        # downloads node_modules/ (a few minutes the first time)
npm run dev        # starts Vite
```

Vite prints a local URL (by default `http://localhost:8080`). Open it. You should see
the dashboard with some seeded exercises and a sample workout. **You are now running
the app from source** — edit a file in `src/` and the browser updates within a second.

**Troubleshooting:**
- `command not found: npm` → Node isn't installed or not on your `PATH`.
- Port 8080 busy → Vite will offer another port, or edit `server.port` in `vite.config.ts`.
- Blank page, console errors about modules → delete `node_modules/` and
  `package-lock.json`, run `npm install` again.

---

## 5. Run, build, test — the command cheat-sheet

All from the repo root unless noted. These are defined in `package.json`'s `scripts`.

| Command | What it does | When you run it |
| --- | --- | --- |
| `npm run dev` | Vite dev server with hot-reload. | While developing. |
| `npm run build` | Production build into `dist/` (includes the PWA service worker). | Before deploying, before `cap sync`, or to check the build passes. |
| `npm run preview` | Serves the `dist/` you just built, as a static site. | To sanity-check the real production output (e.g. offline behaviour). |
| `npm run lint` | ESLint over the whole repo. | Before committing. |
| `npx tsc --noEmit -p tsconfig.app.json` | Type-check without emitting files. | Before committing. (CI runs this.) |
| `npm run test:unit` | Vitest — all `src/**/*.test.ts(x)`. | After any logic change. |
| `npm run test:coverage` | Same, plus a coverage report in `coverage/`. | Occasionally, to see untested code. |
| `npm run test:e2e` | Playwright — starts the app on `127.0.0.1:4173` (and a throwaway sync server on `:3999` for `sync.spec.ts`) and drives a real Chromium browser. | Before a PR touching user-facing flows. First time: `npx playwright install chromium`. |
| `npm run android:sync` | `npm run build` then `cap sync android` — copies `dist/` into the native project. | After any web change you want on the device. |
| `npm run android:open` | Above, then opens Android Studio. | To build/run the APK. |

**In `server/`:**

| Command | What it does |
| --- | --- |
| `npm install` | Server dependencies (separate `package.json`). |
| `npm test` | `node:test` suite via `tsx`. |
| `npm run build` | Compiles `server/src` → `server/dist`. |
| `npx tsc --noEmit` | Type-check the server. |

**The "before you hand off a change" ritual** (this is what CI enforces):

```sh
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run test:unit
npm run build
npm run test:e2e
```

**Try it:** run all five now, on a clean checkout, so you know what "green" looks like
before you change anything.

---

## 6. A guided tour of the repository

Top-level files and folders you will actually touch:

```text
index.html              The single HTML page. Mounts <div id="root"> and loads src/main.tsx.
vite.config.ts          Build config: React plugin, PWA, the Lovable-script stripper, chunk splitting.
tailwind.config.ts      Tailwind setup: which files to scan, the semantic colour tokens → CSS vars.
tsconfig*.json          TypeScript config (app / node / base).
eslint.config.js        Lint rules.
capacitor.config.ts     Android wrapper config (app id, points at dist/, insecure-sync opt-in).
package.json            Dependencies + the scripts from Section 5.
components.json          shadcn/ui config (where to put generated components, import alias).

public/                 Static files copied verbatim into the build (icons, robots.txt, seed images, audio).
src/                    The application (detailed below).
server/                 The optional sync backend — its OWN package.json, not part of the Vite build.
e2e/                    Playwright end-to-end specs + a throwaway sync server for tests.
docs/                   Reference docs + this tutorial.
android/                Generated Capacitor Android project (checked in).
dist/                   Build output (git-ignored in spirit; regenerated by npm run build).
coverage/, test-results/, dev-dist/   Generated; ignore.
```

### Inside `src/`

```text
src/
  main.tsx              Entry point. 7 lines: create the React root, render <App/>.
  App.tsx               The <App>: providers + the full route table.
  index.css             Design tokens (the CSS variables for light & dark), a few global rules.
  App.css               A handful of leftover global styles (mostly unused; prefer Tailwind).

  pages/                ONE FILE PER ROUTE. Index (dashboard), Exercises, Workouts,
                        WorkoutDetail, WorkoutPresentation (the guided runner), Calendar,
                        Courses, CourseDetail, EditCourse, History, Progress,
                        ExerciseProgress, Settings, NotFound.

  components/           Shared UI used by multiple pages.
    calendar/           MonthlyCalendar, WeeklyCalendar, the schedule modals.
    dashboard/          The dashboard cards (streak, weekly goal, quick stats, today's focus…).
    ui/                 shadcn/ui primitives. GENERATED — you own them but avoid hand-editing
                        unless you mean to. button.tsx, dialog.tsx, select.tsx, form.tsx, …

  contexts/
    DataContext.tsx     The single app-wide state provider. Calls the 7 domain hooks,
                        republishes everything on one context, enforces delete rules.

  hooks/                One hook per data collection, all built on useIndexedDBCollection:
    useIndexedDBCollection.ts   The generic load/create/update/remove/clearAll machine.
    useExercises.ts  useWorkouts.ts  useWorkoutSessions.ts  useScheduledWorkouts.ts
    useCourses.ts  useMuscleGroups.ts  useBodyMetrics.ts
    useTheme.ts  useWorkoutMusic.ts  useAutoSync.ts  use-mobile.tsx  use-toast.ts

  data/                TYPES + SEED DATA only. No logic.
    exercises.ts  workoutHistory.ts (WorkoutEntry/WorkoutSet)  workoutSessions.ts
    scheduledWorkouts.ts  courses.ts  muscleGroups.ts  bodyMetrics.ts

  lib/                  Pure-ish logic + integrations, each with a sibling *.test.ts:
    db.ts                     IndexedDB open + typed CRUD wrappers.
    workoutRuntime.ts         Turns a workout into an ordered list of timed "steps".
    recurrence.ts             Expands schedule rules into concrete dated occurrences.
    seedVersion.ts            Additively pick up new seed data on existing installs.
    softDelete.ts             Tombstone helpers for sync.
    referentialIntegrity.ts   "can I delete this exercise/workout?" checks.
    backup.ts / importSchemas.ts   JSON backup/restore + zod validation of imports.
    progression.ts            Suggests the next weight/reps from history (advice only).
    personalRecords.ts  exerciseHistory.ts  muscleGroupVolume.ts  plateMath.ts
    notifications.ts  notificationSettings.ts  notificationDiagnostics.ts
    ambientAudio.ts  customAudio.ts  accessibilitySettings.ts
    syncClient.ts  syncConflicts.ts  settingsSync.ts
    chartA11y.ts  historyCsv.ts  downloadFile.ts  image.ts  bodyProfile.ts  utils.ts

  test/setup.ts        Vitest global setup (jest-dom matchers, a working localStorage shim).
```

The single most important convention, repeated everywhere in `docs/`:

> **Pages and components call `useData()`. They never `import` from `src/lib/db.ts`.**

**Try it:** run `grep -rn "lib/db" src/pages src/components` — you should get **no
hits** (except possibly a test). That's the rule being kept.

---

# Part III — How the app works

## 7. React in 15 minutes (the parts this app uses)

If you already know React, skim to Section 8. Otherwise, here is exactly the subset
this codebase uses.

### Components

A component is a function whose name is Capitalised and which returns markup (JSX):

```tsx
function Greeting({ name }: { name: string }) {
  return <p className="text-lg">Hello, {name}</p>;
}
```

`{ name }` is **props** — inputs passed by the parent: `<Greeting name="Sam" />`. JSX
looks like HTML but it's JavaScript: `className` not `class`, `{expr}` drops a value in,
and you can `.map()` an array into a list of elements.

### State and re-rendering

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);   // [current value, setter]
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

When you call `setCount`, React **re-runs the function** and updates the DOM to match
what it returns. "State changed → re-render" is the whole model.

### Effects

`useEffect(fn, deps)` runs `fn` *after* render, and again whenever a value in `deps`
changes. Used for things that aren't "compute markup from props/state": loading data,
subscribing to events, timers.

```tsx
useEffect(() => { void loadFromDatabase(); }, []);   // [] = run once, on mount
```

You'll see this in every domain hook (load the collection once) and in pages like
`WorkoutDetail` (copy the saved workout into the form once).

### Hooks

A **hook** is any function named `useSomething` that calls other hooks. Rules: only
call them at the top level of a component or another hook, never inside `if`/loops.
Custom hooks are how you share stateful logic. This app's entire data layer is custom
hooks (`useExercises`, `useWorkouts`, …) plus one generic one (`useIndexedDBCollection`).

`useCallback(fn, deps)` / `useMemo(fn, deps)` return a **stable** function/value that
only changes when `deps` change — used to avoid re-creating things on every render
(which would retrigger effects downstream).

`useRef(x)` is a mutable box (`ref.current`) that persists across renders **without**
causing a re-render when you change it. The generic hook uses refs to hold "the latest
config" and "have we loaded once" flags.

### Context

`useState` is local to one component. To share state with the *whole tree* without
passing props through every level, React has **Context**:

```tsx
const MyContext = createContext(undefined);

<MyContext.Provider value={something}>{children}</MyContext.Provider>   // near the root

const value = useContext(MyContext);   // anywhere below
```

This app has exactly **one** app-data context, `DataContext`, created in
`src/contexts/DataContext.tsx` and consumed everywhere via the `useData()` helper.

That's it. No Redux, no Zustand, no React Query. If you understand the six ideas above
you can read every component in this repo.

**Try it:** open `src/components/dashboard/WorkoutStreak.tsx`. Identify: the props (if
any), the `useData()` call, any `useMemo`, and the JSX it returns. That's a
representative component.

---

## 8. The architecture: layers and data flow

Re-draw the picture from Section 2, now with file names:

```text
  src/pages/*.tsx , src/components/**        ← "give me workouts / call createWorkout"
        │   const { workouts, createWorkout } = useData();
        ▼
  src/contexts/DataContext.tsx               ← ONE provider. Calls all 7 hooks, merges
        │                                       their values, adds delete-safety wrappers.
        ▼
  src/hooks/useWorkouts.ts  (and 6 siblings) ← Owns `workouts` (an array in React state)
        │                                       + createWorkout/updateWorkout/deleteWorkout.
        ▼
  src/hooks/useIndexedDBCollection.ts        ← Generic: load(), create(), update(),
        │                                       remove(), clearAll(), getById().
        ▼
  src/lib/db.ts                              ← getAllWorkoutsFromDB(), saveWorkoutToDB(), …
        │                                       (thin typed wrappers over idb)
        ▼
  IndexedDB database "workout-buddy-db"      ← 7 object stores, keyed by `id`
```

### Trace a read

`Workouts.tsx` renders. It calls `useData()`, destructures `workouts`. That array was
put there by `DataContext`, which got it from `useWorkouts()`, which got it from
`useIndexedDBCollection`'s `items` state. `items` was filled by `load()` running once
on mount, which called `getAllWorkoutsFromDB()`. **No database call happens during
render** — the data is already in memory. Rendering is pure.

### Trace a write

User submits the "create workout" form in a modal:

1. The modal calls `createWorkout({ title, category, sets, … })` from `useData()`.
2. That's `useIndexedDBCollection`'s `create`. It builds the full record:
   `{ ...data, updatedAt: <now>, id: crypto.randomUUID() }` (plus any `stamp()` fields
   like `createdAt`).
3. It calls `save(newItem)` → `saveWorkoutToDB` → `db.put('workouts', newItem)`.
   **The database write completes first.**
4. *Then* it updates React state: `setItems(prev => [...prev, newItem])` (running the
   collection's `transform`, e.g. sort-by-date).
5. React re-renders every component using `workouts`. The new workout appears on the
   dashboard, the workouts list, everywhere — because they all read the *same* array
   from the *same* context.

> **Rule: write to IndexedDB *before* updating React state.** If the DB write throws,
> state never changes, so the UI can't show data that wasn't saved. Every hook obeys
> this. (`docs/development.md` lists "duplicate items after create" as the classic bug
> from breaking it — a hook that both pushes locally *and* refetches.)

### Why one context instead of many

Because a workout created in a modal must instantly be visible on the dashboard, the
calendar, and the course builder. One shared array makes that automatic. The cost —
any change re-renders any consumer — is negligible at this data scale (hundreds of
records, not millions).

### `DataContext` also enforces delete safety

IndexedDB has no foreign keys. So `DataContext` wraps the raw `deleteExercise` /
`deleteWorkout` from the hooks with checks from `src/lib/referentialIntegrity.ts`: you
cannot delete an exercise that any workout template or completed session still
references, and you cannot delete a workout that history, a course, or a calendar entry
points at. It returns a human-readable reason instead. (Section 18.)

**Try it:** in `DataContext.tsx`, find where `deleteExerciseRaw` (from the hook) is
wrapped into the `deleteExercise` that's actually exposed on the context. Notice the
check happens *before* the raw delete is called.

---

## 9. The persistence layer: IndexedDB via `idb`

**IndexedDB** is a database built into every browser. It stores JavaScript objects
(not rows/columns), organised into **object stores** (like tables). It's transactional,
asynchronous, and origin-scoped (one database per site). Its native API is
callback-and-event based and unpleasant, so this project uses **`idb`**, a ~1KB wrapper
that gives it promises.

Everything lives in `src/lib/db.ts`. The shape:

```ts
const DB_NAME = 'workout-buddy-db';
const DB_VERSION = 6;

export interface WorkoutBuddyDB {
  exercises: Exercise;
  workouts: WorkoutEntry;
  scheduledWorkouts: ScheduledWorkout;
  courses: Course;
  workoutSessions: WorkoutSession;
  muscleGroups: MuscleGroup;
  bodyMetrics: BodyMetric;
}
```

Seven object stores, each **keyed by `id`** (a `crypto.randomUUID()` string).

### Opening the database

```ts
let dbPromise = null;
export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('exercises'))
          db.createObjectStore('exercises', { keyPath: 'id' });
        // …one guarded block per store…
        if (!db.objectStoreNames.contains('bodyMetrics'))
          db.createObjectStore('bodyMetrics', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};
```

Two things to understand:

- **The promise is memoised.** `getDB()` opens the database *once* per page load; every
  caller awaits the same promise.
- **`upgrade` runs when `DB_VERSION` is higher than the version on the user's device.**
  Each block is guarded with `if (!contains(...))`, so upgrading only *adds* missing
  stores — **existing user data is never dropped**. This is the migration mechanism:
  bump `DB_VERSION`, add one guarded `createObjectStore`, done.

### The CRUD wrappers

For each store there's a small, predictable set:

```ts
export const getAllWorkoutsFromDB   = async () => (await getDB()).getAll('workouts');
export const getWorkoutByIdFromDB   = async (id) => (await getDB()).get('workouts', id);
export const saveWorkoutToDB        = async (w)  => { await (await getDB()).put('workouts', w); };
export const deleteWorkoutFromDB    = async (id) => { await (await getDB()).delete('workouts', id); };
export const bulkSaveWorkoutsToDB   = async (list) => { /* one readwrite transaction, put each */ };
```

Note `put` (not `add`): `put` is an **upsert** keyed by `id`, so "create" and "update"
are the same operation at the DB level. That's why the generic hook can be so small.

### The separate audio database

There's a *second*, unrelated IndexedDB database, `workout-buddy-audio`
(`src/lib/customAudio.ts`), holding at most one user-supplied backing track. It's kept
separate so a multi-megabyte audio blob never gets swept into a backup file or a sync
payload.

**Try it:** in DevTools → Application → IndexedDB, expand `workout-buddy-db` → `workouts`.
Each entry is exactly a `WorkoutEntry` object. Now run `getAllWorkoutsFromDB()` mentally
against it — it's just `store.getAll()`.

---

## 10. The generic collection hook (the heart of the app)

`src/hooks/useIndexedDBCollection.ts` is ~155 lines and is the piece most worth reading
closely. All seven domain hooks are a thin call to it.

### What a domain hook looks like

`useExercises.ts` in full is basically:

```ts
export const useExercises = () => {
  const { items, isLoading, error, load, create, update, remove, getById } =
    useIndexedDBCollection<Exercise>({
      getAll: getAllExercisesFromDB,
      save: saveExerciseToDB,
      remove: deleteExerciseFromDB,
      bulkSave: bulkSaveExercisesToDB,
      defaults: exerciseList,     // seed data for a fresh install
      seedKey: 'exercises',       // enables additive seed migration (Section 17)
      errorMessage: 'Failed to load exercises',
    });

  return {
    exercises: items,
    isLoading, error,
    createExercise: create,
    updateExercise: update,
    deleteExercise: remove,
    getExerciseById: getById,
    refreshExercises: load,
  };
};
```

`useWorkouts` adds a `transform: byDateDescending` (keep the array sorted) and a
`fetchWorkoutById` (read a *fresh* value straight from the DB for pages that need it).
`useCourses` layers on course-specific operations (`startCourse`, `completeWorkoutInCourse`, …)
on top of the generic primitives. Same pattern everywhere.

### What the generic hook provides

Reading the source, these are the moving parts:

- **`items` / `isLoading` / `error`** — React state. `items` is the in-memory copy.
- **`load()`** — runs once on mount (`useEffect(() => { void load() }, [load])`):
  1. `getAll()` from the DB.
  2. If the store is **empty and `defaults` exist** → `bulkSave(defaults)`, record the
     seed version, use `defaults`. (Fresh install seeding.)
  3. Otherwise → compute `pendingSeedAdditions` (new defaults added since this device
     last seeded), insert those, then **filter out tombstones** (`isLiveRecord`) so
     soft-deleted records don't show. (Section 17 & 28.)
  4. `setItems(transform ? transform(loaded) : loaded)`.
  - **`isLoading` is only set on the *first* load.** A later refresh (e.g. after a sync
    pull) keeps the old data on screen — toggling `isLoading` would unmount the page
    that triggered the refresh. There's a long comment about this bug; leave it alone.
- **`create(data)`** — builds `{ ...data, ...stamp?.(), updatedAt: now, id: uuid }`,
  `save()`s it, then `setItems(prev => [...prev, newItem])`. Returns the new item.
  `updatedAt` is stamped **always**, sync on or off — it's the watermark last-write-wins
  sync compares.
- **`update(id, updates)`** — find in `items`, merge, bump `updatedAt`, `save()`,
  `setItems(map replace)`.
- **`remove(id)`** — **branches on sync**: if a sync server is connected
  (`isConnected()`), write a `deletedAt` tombstone instead of deleting, so the deletion
  propagates. Offline, hard-delete. Either way, drop it from `items`.
- **`clearAll()`** — same sync branch, bulk.
- **`getById(id)`** — synchronous lookup in the in-memory `items`.

### The type-level trick

```ts
create: (data: Omit<T, 'id' | StampedKeys>) => Promise<T>
```

`create` won't *let* you pass `id` or the stamped fields (`createdAt` for workouts and
courses, etc.) — they're removed from the argument type, because the hook generates
them. TypeScript enforces the "don't set these yourself" rule for you.

**Try it:** pick any two domain hooks and diff them in your head. Everything they don't
share is the collection's genuine domain logic; everything they do share is in the
generic hook. This is the codebase's core idea — one abstraction, seven small
specialisations.

---

## 11. The data model, entity by entity

Full field-by-field detail is in `docs/data-model.md`. Here's the conceptual version
with the relationships that matter.

```text
MuscleGroup ──tagged on──►  Exercise  ──referenced by──►  WorkoutEntry (template)
                                │                              │
                                │                     ┌────────┼─────────────┐
                                │                     ▼        ▼             ▼
                          (also in)          ScheduledWorkout  CourseWorkout  WorkoutSession
                          WorkoutSession       (calendar rule)  (program item)  (history snapshot)
BodyMetric  (standalone: dated body-weight readings)
```

| Entity | File | One-line role | Lifecycle |
| --- | --- | --- | --- |
| **Exercise** | `data/exercises.ts` | A single movement: name, category, muscle groups, difficulty, optional image, `logType` (reps vs time), optional `unilateral`, optional `progression` policy. | User-owned, editable. Seeded on first run. |
| **MuscleGroup** | `data/muscleGroups.ts` | An editable tag (`Chest`, `Quads`). IDs stay stable when renamed. | Seeded; editable. |
| **WorkoutEntry** | `data/workoutHistory.ts` | A reusable **template**: a title, a category, and a **flat ordered `WorkoutSet[]`**. "3×12 bench" = three sets with the same `exerciseId`. | Editable plan. Editing it never touches history. |
| **WorkoutSet** | same file | One block of work: `reps`+`weight` **or** `duration`/`distance`, `restAfter`, flags `warmup` / `amrap`. | Part of a template or a session. |
| **WorkoutSession** | `data/workoutSessions.ts` | An **immutable snapshot** written when guided mode finishes: it `extends WorkoutEntry` and adds `workoutId`, `completedAt`, `plannedDuration`, optional `courseId`/`courseItemId`/`scheduledWorkoutId`, `actualSets` (per-set results + RPE), `perceivedExertion`, `completionNotes`. | Append-only (the History correction dialog is the one exception). History, streaks, charts read **only** this. |
| **ScheduledWorkout** | `data/scheduledWorkouts.ts` | A calendar **rule**, not a list of dates: `workoutId`, `startDate`, `startTime`, `recurrence` (`none`/`daily`/`weekly`), `recurrenceDays[]`, `endRecurrenceDate`, `skippedDates[]`. | Editing/deleting the rule changes the whole series. |
| **Course** | `data/courses.ts` | A multi-week program: metadata (goal, difficulty, prerequisites, `durationWeeks`) + `CourseWorkout[]`. | `startCourse` stamps `startedAt`; completion is per-item. |
| **CourseWorkout** | same file | One program slot: `type` `workout`\|`rest`, optional `workoutId`, `week`, `day` (1–7), `order`, `instructions`, `completed`/`completedAt`. Its **own `id`** is what completion is keyed on (so the same workout can appear twice). | |
| **BodyMetric** | `data/bodyMetrics.ts` | A dated body-weight reading, kept sorted for the progress chart. | Standalone. |

### Design decisions worth internalising

1. **Template vs. session are different stores on purpose.** A template is an editable
   plan; a session is a historical fact. Never merge them. (`docs/development.md`:
   "History changes when a template is created" is the bug from getting this wrong.)
2. **A workout is a *flat* list of sets.** The UI groups consecutive same-exercise sets
   for display, but circuits/supersets are encoded purely by *order*. Re-sorting the
   array globally would silently rewrite people's circuits. Preserve order.
3. **Schedules are rules, expanded at read time.** Nothing recurring is ever written
   per-day. `recurrence.ts` projects rules onto a date range on demand. (Section 16.)
4. **Course progress uses `courseItemId`, not `workoutId`.** Because the same template
   can be slot 3 *and* slot 9 of a program.
5. **Dates are ISO strings in storage** (`"2026-08-31"` or a full timestamp), formatted
   for display with `date-fns`. Strings survive IndexedDB round-trips unchanged; `Date`
   objects are a footgun.
6. **`id` is always `crypto.randomUUID()`.** Generated by the hook, never by you.
7. **New optional field → no migration.** Old records just have it `undefined`. Only a
   **new store** needs a `DB_VERSION` bump.

**Try it:** open `src/data/workoutSessions.ts` and confirm `WorkoutSession extends
WorkoutEntry`. Then open `History.tsx` and confirm it reads `sessions` from `useData()`,
never `workouts`.

---

## 12. Routing and pages

`src/App.tsx` is the whole route table. Structure:

```tsx
<ErrorBoundary>
  <TooltipProvider>
    <DataProvider>            {/* app-wide data — Section 8 */}
      <AutoSync />            {/* background sync if a server is configured */}
      <AccessibilityController />   {/* applies text-size / reduced-motion classes */}
      <PwaUpdatePrompt />     {/* registers the service worker, shows "Update available" */}
      <Toaster /> <Sonner />  {/* the two toast systems */}
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            {/* …one <Route> per screen… */}
            <Route path="/workouts/:id" element={<WorkoutDetail />} />
            <Route path="/workouts/:id/session" element={<WorkoutPresentation />} />
            {/* legacy URLs kept for old bookmarks/schedules */}
            <Route path="/workout/:id" element={<WorkoutDetail />} />
            {/* ADD CUSTOM ROUTES ABOVE THIS LINE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DataProvider>
  </TooltipProvider>
</ErrorBoundary>
```

Key points:

- **Every route except the dashboard (`Index`) is `React.lazy`-loaded.** The
  `const X = lazy(() => import('./pages/X'))` lines mean each page's code is a separate
  file that only downloads when you navigate there. One `<Suspense>` shows a spinner
  during that fetch. Initial JS is ~100 KB gzip.
- **The catch-all `path="*"` must be last.** React Router matches in order; anything
  after it is dead. There's a literal comment marking the spot.
- **`:id` is a URL parameter.** Inside the page: `const { id } = useParams()`.
- **Navigation:** `const navigate = useNavigate(); navigate('/workouts/' + id)`. Links
  in the nav drawer live in `src/components/Navbar.tsx`.

### The anatomy of a page

`WorkoutDetail.tsx` is representative:

```tsx
const WorkoutDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workouts, exercises, createWorkout, updateWorkout, deleteWorkout } = useData();
  const workout = workouts.find(w => w.id === id);

  // local form state with useState…
  // one useEffect that copies `workout` into the form ONCE (guarded by a
  //   loadedWorkoutId ref) so a background sync mid-edit can't stomp your typing
  // handlers that call updateWorkout / deleteWorkout / navigate
  // JSX: <Navbar/>, a form built from src/components/ui/* primitives,
  //   an <AlertDialog> confirmation for delete
};
```

Patterns you'll see on nearly every page:
- Get data + operations from `useData()`.
- Derive what you need with `.find` / `.filter` / `useMemo`.
- Local UI state (which tab, is the dialog open, form fields) with `useState`.
- Destructive actions go through an `<AlertDialog>` (a shadcn/ui primitive) — never a
  bare `window.confirm`, never an unconfirmed delete.

**Try it:** add a throwaway route. In `App.tsx` add
`<Route path="/hello" element={<div className="p-8 text-foreground">hi</div>} />`
above the catch-all, save, visit `/hello`. Then remove it.

---

## 13. Styling, theming, and the design tokens

### Tailwind, briefly

Instead of writing CSS, you compose utility classes on elements:

```tsx
<div className="flex items-center justify-between gap-3 rounded-lg border p-4">
```

`tailwind.config.ts` says which files to scan for class names and defines the theme.
`postcss.config.js` wires Tailwind into the build. `tailwindcss-animate` adds
animation utilities; `@tailwindcss/typography` styles long-form prose (`prose` class).

### Semantic colour tokens — the rule that matters

Colours are **not** written as `bg-white` / `text-gray-900` / `#0f172a`. They are
**semantic tokens** defined once as CSS variables in `src/index.css`:

```css
:root {
  --background: 210 40% 98%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221 83% 53%;
  --muted-foreground: 215.4 16.3% 46.9%;
  /* … */
}
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* …every token redefined for dark… */
}
```

`tailwind.config.ts` maps those to class names, so in components you write
`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`,
`border-border`, etc. **Dark mode then works automatically** — flipping the `.dark`
class on `<html>` swaps every variable.

> Hardcoded utilities like `bg-gray-50` or `text-white` **break dark mode** and have
> caused real, shipped bugs in this project (`docs/development.md`: "a page renders
> white in dark mode"). Do not reintroduce them. If you need a new colour, add a token.

### Theming

`src/hooks/useTheme.ts` + `src/components/ThemeToggle.tsx` toggle the `.dark` class on
`document.documentElement` and persist the choice in `localStorage`. `next-themes` is
the underlying mechanism. `AccessibilityController` similarly toggles
`html.text-size-large` and `html.reduce-motion`, which `index.css` acts on.

### `cn()`

`src/lib/utils.ts` exports `cn(...classes)` — merges conditional class strings and
resolves Tailwind conflicts (so `cn('p-2', condition && 'p-4')` gives `p-4`, not both).
Used throughout `src/components/ui/`.

**Try it:** find a `text-muted-foreground` in any component, change it to `text-red-500`,
observe in both themes, then revert. Now you've felt why tokens exist.

---

## 14. Forms and validation

Create/edit modals (`CreateWorkoutModal`, `ExerciseForm`, `CreateCourseModal`, …) use:

- **react-hook-form** — `useForm()` returns `register`, `handleSubmit`, `formState`.
  It keeps inputs uncontrolled for performance and gathers values on submit.
- **zod** + **@hookform/resolvers** — a `z.object({...})` schema describes valid input;
  `zodResolver(schema)` plugs it into react-hook-form so invalid fields show messages.
- **`src/components/ui/form.tsx`** — shadcn/ui's wrapper that ties a label, input,
  description and error message together accessibly (`<FormField>`, `<FormItem>`,
  `<FormMessage>`).

zod's other big job is at the **import boundary**: `src/lib/importSchemas.ts` validates
every record in a restored backup or a shared workout file before it touches the
database (Section 19).

**Try it:** open `src/components/ExerciseForm.tsx`. Find the zod schema and the
`useForm` call. Trace one field from schema → `<FormField>` → the DB write in the
submit handler.

---

# Part IV — Deep dives

## 15. The guided workout runtime

Files: `src/lib/workoutRuntime.ts` (pure logic, well tested) and
`src/pages/WorkoutPresentation.tsx` (the full-screen UI).

### The idea

A `WorkoutEntry` is a flat `WorkoutSet[]`. To *run* it you need an ordered list of
**steps** — some are "do this exercise", some are "rest N seconds" — and you need every
step to have a duration so one countdown mechanism handles all of them.

`buildWorkoutSteps(workout, exercises)` produces `WorkoutStep[]`:

1. Start with a **prep** rest (`PREP_DURATION_SECONDS = 10`) — time to get into
   position after tapping Start.
2. For each authored set, in order:
   - Compute its **duration**. Timed sets already have one (`set.duration`). **Reps
     sets get a synthesized one**: `secondsPerRep × reps` (default 5 s/rep, overridable
     per exercise) so the runner can show a follow-along countdown instead of an
     open-ended "do 10 reps whenever".
   - If the exercise is **`unilateral`**, the one set expands into three steps:
     `left` → a short `switch` pause (`SWITCH_SIDES_DURATION_SECONDS = 5`) → `right`.
     Both sides keep the same `sourceSetIndex`/`setIndex` so results still map back to
     the single authored set.
   - Append a **rest** step before the next set, using (in priority order): the set's
     own `restAfter`; else, if the next set is the *same* exercise,
     `restBetweenSets` (default 10); else `restBetweenExercises` (default 30).
3. `secondsPerRep`, `warmup`, `amrap`, `side`, and `kind` (`prep`/`rest`/`switch`) ride
   along on each step for the UI to label and announce correctly.

### Timing that survives a locked phone

The player does **not** count down with `setInterval(--seconds)`. It stores an absolute
**deadline** (`Date.now() + duration*1000`) and each tick computes
`remainingSeconds(deadline)` = `ceil((deadline - now)/1000)`. If the phone sleeps for 40
seconds, the timer "catches up" on wake instead of drifting. It also requests a
**screen wake lock** and **persists the active step** to `localStorage` so an
interrupted session resumes where it left off.

### Self-paced vs timed steps

A reps-based exercise step (has `secondsPerRep`) is **self-paced**: no ticking clock, no
auto-advance — you do your reps and press Next. Everything else (rests, prep/switch,
genuinely timed exercises) runs a real countdown and auto-advances at zero. There's a
comment block in `workoutRuntime.ts` spelling this out.

### On completion

The player writes exactly **one** `WorkoutSession` (via `createSession` from
`useData()`), carrying `actualSets`, elapsed duration, and any course/schedule links.
That write is what advances a linked course item and what History/streaks/charts read.

**Try it:** `src/lib/workoutRuntime.test.ts` is the best spec of this behaviour. Read
the test names — they enumerate every rule above. Then build a 2-exercise circuit in
the app and run it; watch prep → ex1 → rest → ex2 → rest → ex1 …

---

## 16. The calendar and recurrence expansion

File: `src/lib/recurrence.ts`, consumed by `useScheduledWorkouts`.

A `ScheduledWorkout` is a **rule**. The calendar needs concrete dated occurrences.
`expandScheduledWorkouts(rules, startDate, endDate)` returns
`ExpandedScheduledWorkout[]` — each a copy of the rule plus a concrete `displayDate` and
a `skipped` boolean — for occurrences that fall in `[startDate, endDate]`:

- **`recurrence: 'none'`** → at most one occurrence, on `startDate`, if it's in range.
- **`'daily'`** → step day by day from `max(startDate, rangeStart)` to
  `min(endRecurrenceDate, rangeEnd)`, emitting each.
- **`'weekly'`** with `recurrenceDays: WeekDay[]` → same walk, but only emit days whose
  weekday is in `recurrenceDays`.

`skipped` is set when `displayDate` is in the rule's `skippedDates[]`. A skipped
occurrence still renders (greyed, restorable). **Moving** one occurrence of a series
adds that date to `skippedDates` *and* creates a new one-off `ScheduledWorkout` on the
target date — the rest of the series is untouched.

All date arithmetic uses **date-fns** (`addDays`, `isBefore`, `isSameDay`, `parseISO`,
`format`) — never manual `new Date()` maths, which trips over DST and time zones.

`getScheduledWorkoutsForRange` / `...ForDate` on the hook are the public entry points;
the monthly and weekly calendar components call them with the visible window.

**Try it:** `src/lib/recurrence.test.ts` covers range edges, end dates and skips.
Schedule a "weekly on Mon/Wed" workout in the app and page the calendar forward — every
visible instance came out of this one function.

---

## 17. Seeding and seed migrations

Two related problems:

**(a) A fresh install shouldn't be empty.** So `useExercises` / `useWorkouts` /
`useMuscleGroups` pass `defaults` (the `exerciseList`, etc. arrays from `src/data/`).
When `load()` finds the store empty, it `bulkSave`s the defaults.

**(b) You add three new starter exercises in v1.4. Existing users are past the
"empty store" path — how do they get them?** That's `src/lib/seedVersion.ts`:

- Each seeded collection has a `seedKey` (`'exercises'`, …) and there's a global
  `SEED_VERSION` integer.
- `localStorage` remembers the `SEED_VERSION` this device last seeded, per key.
- On load, `pendingSeedAdditions(stored, defaults, deviceVersion, SEED_VERSION)` returns
  any default whose `id` this device has **never seen** — and it treats a **tombstone**
  (a soft-deleted row) as "seen", so a default the user deliberately deleted is **not**
  resurrected. Those additions are inserted; the device's marker is bumped.

So the workflow to add starter content later is: **add entries to the `src/data/*.ts`
array, bump `SEED_VERSION`.** Every device additively picks them up on next load,
without touching anything the user created, edited, or deleted.

`SEED_IDS` also keeps the sync layer from compacting away a tombstone for a seed item
(otherwise it'd come back on the next full pull).

**Try it:** read `src/lib/seedVersion.test.ts`. It's the clearest statement of "add
new, never resurrect deleted, never clobber edited".

---

## 18. Referential integrity (why some deletes are blocked)

IndexedDB won't stop you deleting an exercise that 5 workouts still use — you'd just get
dangling IDs. `src/lib/referentialIntegrity.ts` provides:

- `checkExerciseDeletion(exerciseId, workouts, sessions)` → is it used by any template
  or any completed session?
- `checkWorkoutDeletion(workoutId, sessions, courses, scheduledWorkouts)` → is it in any
  history record, course, or calendar entry?

`DataContext` calls these *before* the raw hook delete and, if blocked, returns a
human-readable explanation instead of deleting. The product decision (see
`docs/data-model.md`) is: **protect the user's program/schedule/history over
convenient cascading deletes.** To actually remove the thing, the user first removes the
references.

**Try it:** seed data has a workout that uses "Bench Press". Try to delete "Bench Press"
from the Exercises page — you'll get the block message naming the workout.

---

## 19. Backup / restore and the import schemas

Files: `src/lib/backup.ts`, `src/lib/importSchemas.ts`.

- **Backup** = a **versioned JSON document**. **Version 3** carries the full state: all
  seven collections + a whitelist of `localStorage` `preferences` (theme, weekly goal,
  accessibility, reminders, height, plate-bar — **sync credentials and seed markers are
  deliberately excluded**) + the optional custom audio track as a data URL. Legacy v1/v2
  files still restore.
- **Restore** runs **every record through a zod schema** first. Malformed records and
  duplicate `id`s are **dropped and surfaced as warnings in the confirm dialog** before
  anything is written. Then the included stores are replaced in **one transaction** and
  preferences/audio are written back.
- **Security hardening at this boundary** (it's the main place untrusted data enters):
  every `imageUrl` is constrained to `https:` or an `image/*` data URI; CSV export
  escapes leading `= + - @` to defeat spreadsheet formula injection.
- **Platform:** on Android the file goes to the cache dir + the native share sheet
  (`@capacitor/filesystem` + `@capacitor/share`); on web it downloads as `.json`
  (`src/lib/downloadFile.ts`).

This is the **safety net** that exists regardless of whether sync is set up — the
`docs/` repeatedly recommend taking a backup from Settings before an app update.

**Try it:** Settings → export a backup, open the `.json` in an editor, note the
`version` and the top-level keys. `src/lib/backup.test.ts` and `backup.restore.test.ts`
show the round-trip and the validation drops.

---

## 20. Progressive Web App: offline and updates

Config lives in `vite.config.ts` under `VitePWA({...})`.

- **`workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']`** — the build
  **precaches the entire app shell**. A first visit that loses connectivity mid-load
  can't end up half-installed. `cleanupOutdatedCaches` clears old precaches on activate.
- **`navigateFallback: '/index.html'`** — any route resolves to the SPA shell offline.
- **`registerType: 'prompt'`** — a new deploy does **not** silently swap the running
  code. `src/components/PwaUpdatePrompt.tsx` uses the `virtual:pwa-register/react`
  module and shows an **"Update available"** toast; the user chooses when to reload.
- **`devOptions.enabled: false`** — the service worker only exists in the *build*. A dev
  SW fights Vite's hot-reload. CI instead asserts `dist/sw.js` exists and contains
  `precacheAndRoute`.
- **App data is IndexedDB and the service worker never touches it.** The SW caches
  *code and assets*; your workouts are unaffected by an update.

The Android (Capacitor) build doesn't need any of this — it already serves its own
bundled assets from disk and is offline by construction.

**Try it:** `npm run build && npm run preview`, open it, then in DevTools → Network set
"Offline" and reload. It still works. Look at Application → Service Workers.

---

## 21. Accessibility and the guided-session cues

- **Device preferences** (Settings): large text and reduced motion.
  `AccessibilityController` (mounted in `App.tsx`) applies `html.text-size-large`
  (bumps root `font-size` to 18px) and `html.reduce-motion` (near-zero animation
  durations) — both handled in `src/index.css`. It also respects the OS
  `prefers-reduced-motion`.
- **Guided-mode cues** (`src/lib/` + `useWorkoutMusic`): optional spoken cues
  (`@capacitor-community/text-to-speech` on device, Web Speech in the browser), haptic
  buzzes (`@capacitor/haptics`), and screen-reader status announcements as steps
  change. Phone-safe large controls in the runner.
- **Optional background music** during a guided workout: either a generated Web Audio
  ambient bed (no asset, fully offline — `src/lib/ambientAudio.ts`) or a user-supplied
  file kept in the *separate* `workout-buddy-audio` IndexedDB DB
  (`src/lib/customAudio.ts`). Full write-up in `docs/workout-audio.md`.
- **Charts** expose an accessible text alternative via `src/lib/chartA11y.ts`.
- **Tests:** `e2e/accessibility-mobile.spec.ts` runs Settings at 360×640 and the guided
  controls at 320×568, checks reduced-motion, large text, and horizontal overflow. Keep
  these green when touching navigation, Settings, or guided mode.

**Try it:** Settings → enable large text and reduced motion, then run a workout. Notice
the runner stays usable and stops animating.

---

# Part V — Changing the app

Each recipe is a concrete, ordered checklist. They mirror `docs/development.md` ("How
to add a feature") with more explanation.

## 22. Recipe: add a field to an existing entity

**Example: add `equipment?: string` to `Exercise`.**

1. **Type** — add it to the interface in `src/data/exercises.ts`:
   ```ts
   equipment?: string;   // optional → no DB migration needed
   ```
   Optional is the key: old records simply have it `undefined`.
2. **Seed data (optional)** — set it on some entries in `exerciseList` if you want
   defaults to carry it. If you want *existing* installs to pick that up, also bump
   `SEED_VERSION` in `src/lib/seedVersion.ts` (Section 17).
3. **Form** — surface it in `src/components/ExerciseForm.tsx`: add it to the zod schema
   (`equipment: z.string().optional()`), add a `<FormField>` with an `<Input>`.
4. **Display** — render it wherever exercises are shown: `ExerciseItem.tsx`,
   `ExerciseDetailModal.tsx`, maybe the workout builder.
5. **Nothing else.** No `db.ts` change, no `DB_VERSION` bump, no hook change — `create`
   and `update` already spread arbitrary fields through to `put`.
6. **Test** — extend `ExerciseForm`'s test or add an assertion where the field renders.
   Add an e2e assertion if it's a visible workflow.

**Do not** make it required without thinking about the hundreds of existing records
that won't have it — you'd need a migration to backfill, which this app avoids.

## 23. Recipe: add a whole new entity / object store

**Example: a `Goal` entity (a dated target).** This is the "new store" path, so it
*does* need a `DB_VERSION` bump.

1. **Type + seed** — `src/data/goals.ts`:
   ```ts
   export interface Goal {
     id: string;
     title: string;
     targetDate: string;      // ISO
     createdAt: string;       // stamped by the hook
     updatedAt?: string;      // sync watermark
     deletedAt?: string;      // sync tombstone
   }
   export const defaultGoals: Goal[] = [];
   ```
2. **`src/lib/db.ts`:**
   - Add `goals: Goal;` to the `WorkoutBuddyDB` interface.
   - Bump `DB_VERSION` (e.g. `6` → `7`).
   - In `upgrade`, add a guarded block:
     ```ts
     if (!db.objectStoreNames.contains('goals'))
       db.createObjectStore('goals', { keyPath: 'id' });
     ```
   - Add the CRUD wrappers: `getAllGoalsFromDB`, `saveGoalToDB`, `deleteGoalFromDB`,
     `bulkSaveGoalsToDB` — copy an existing set verbatim and rename.
3. **Hook** — `src/hooks/useGoals.ts`, modelled on `useWorkouts.ts`:
   ```ts
   export const useGoals = () => {
     const c = useIndexedDBCollection<Goal, 'createdAt'>({
       getAll: getAllGoalsFromDB, save: saveGoalToDB, remove: deleteGoalFromDB,
       bulkSave: bulkSaveGoalsToDB,
       errorMessage: 'Failed to load goals',
       stamp: () => ({ createdAt: new Date().toISOString() }),
       transform: list => [...list].sort((a,b) => a.targetDate.localeCompare(b.targetDate)),
     });
     return { goals: c.items, goalsLoading: c.isLoading, /* …renamed primitives… */ };
   };
   ```
4. **`DataContext`** — call `useGoals()` in `DataProvider`, add its values to the
   context type and the provider `value`, and (if goals can reference workouts) add a
   referential-integrity check for deleting a workout that a goal points at.
5. **UI** — build pages/components on `useData()` only.
6. **Sync (if you run a server)** — add a matching table + migration + route in
   `server/` (Section 27). Optional; the app works without it.
7. **Tests** — a `db.test.ts` case for the new store, a hook test, an e2e for the flow.

> **Never reuse an existing store for a concept with a different lifecycle.** Templates
> are editable; sessions are immutable snapshots; a goal is neither. Separate stores.

## 24. Recipe: add a new page

1. **Create** `src/pages/Goals.tsx`. Start from the skeleton in Section 12: `useData()`,
   derive, local `useState`, render `<Navbar/>` + content.
2. **Route** — in `src/App.tsx`:
   ```tsx
   const GoalsPage = lazy(() => import('./pages/Goals'));   // with the other lazy imports
   // …
   <Route path="/goals" element={<GoalsPage />} />          // ABOVE the "*" catch-all
   ```
3. **Navigation** — if it's a primary destination, add a link in
   `src/components/Navbar.tsx` (there's a list of nav items with a lucide icon each).
4. **Test** — an e2e spec in `e2e/` for the main flow, following an existing one's shape.

## 25. Recipe: add or restyle a UI component

- **A new shared component** (not a route): put it in `src/components/` (or a
  subfolder). Compose it from `src/components/ui/*` primitives and Tailwind **semantic
  tokens only**. Keep it presentational — pass data and callbacks in as props; let the
  page do the `useData()` call.
- **A new shadcn/ui primitive** you don't have yet (say a `Combobox`): these are
  normally added with the shadcn CLI (`components.json` configures it), which drops a
  file into `src/components/ui/`. You then own that file.
- **Restyling:** change the Tailwind classes. If you're tempted to write a hex value,
  add a token to `src/index.css` (both `:root` and `.dark`) and map it in
  `tailwind.config.ts` instead.
- **Destructive actions** must use `<AlertDialog>` from `ui/alert-dialog.tsx`.
- Check the result in **both themes** and at a **narrow mobile width** (the e2e
  accessibility spec will fail otherwise).

## 26. Testing your changes

Covered in depth in Section 26 below? No — here. Three layers:

### Unit / logic tests (Vitest) — `src/**/*.test.ts`

The preferred place for anything with rules. Pure functions in `src/lib/` each have a
sibling `*.test.ts`. Example shape:

```ts
import { describe, it, expect } from 'vitest';
import { buildWorkoutSteps } from './workoutRuntime';

describe('buildWorkoutSteps', () => {
  it('inserts a 10s prep step first', () => {
    const steps = buildWorkoutSteps({ /* minimal workout */ } as any, []);
    expect(steps[0]).toMatchObject({ type: 'rest', kind: 'prep', duration: 10 });
  });
});
```

- Tests run in **Node** by default. A component/hook test opts into a DOM with a
  `// @vitest-environment jsdom` docblock at the top and uses `@testing-library/react`.
- Tests touching IndexedDB start with `import 'fake-indexeddb/auto';`.
- Modules that `vi.mock('@/lib/db')` must define shared spies via `vi.hoisted(...)`
  (the mock factory is hoisted above top-level `const`s).
- `src/test/setup.ts` registers jest-dom matchers and a working `localStorage`.

**Rule of thumb:** extract logic into `src/lib/` with its own test rather than testing
it through a component.

### Hook tests

`src/hooks/*.test.tsx` render a hook with `renderHook` and assert on its return value
across `act(async () => { ... })` calls. `domainHooks.test.tsx`,
`useIndexedDBCollection.test.tsx`, `useCourses.test.tsx` are good models.

### End-to-end (Playwright) — `e2e/*.spec.ts`

Drives real Chromium against the built app. `playwright.config.ts` auto-starts the app
on `127.0.0.1:4173`; `e2e/sync.spec.ts` additionally boots a throwaway sync server on
`:3999` (`e2e/support/sync-server.mjs`, fresh SQLite + one account per run). Each test
gets a fresh browser context. First run: `npx playwright install chromium`.

Add or update an e2e test for any **user-visible workflow** you change.

### What CI will run on your PR

`.github/workflows/ci.yml` → job **verify**: `npm ci`, `lint`, `tsc --noEmit`,
`test:unit`, `build`, a PWA-output check, then Playwright. Job **server**:
`cd server && npm ci && npm run build && npm test`. Both must pass to merge to `main`.

**Try it:** break something small on purpose (rename a prop), run
`npx tsc --noEmit -p tsconfig.app.json`, read the error, fix it. That loop is 80% of
day-to-day work.

---

# Part VI — Advanced

## 27. The optional self-hosted sync server

Everything so far works with **no server**. `server/` is an *opt-in* backend so one
person can use their library on several of **their own** devices. Full design rationale,
schema and status: `docs/self-hosted-sync.md`. Summary:

- **Separate project.** Own `package.json`, own `tsconfig.json`, **not** part of the
  Vite build. `cd server` to work on it.
- **Stack:** Node + TypeScript, **Fastify** for HTTP, **better-sqlite3** for storage
  (one `.sqlite` file), `node:test` via `tsx` for tests.
- **Schema:** `server/src/db/migrations/*.sql`, applied in numeric order at startup
  (001_init … 015_user_settings). Mirrors the seven client collections plus users,
  sessions and user settings.
- **Auth:** accounts are **admin-created only** — there is no public signup. CLI:
  `server/src/cli/create-user.ts`, `reset-password.ts`. Passwords hashed
  (`server/src/auth/password.ts`). Login returns an **opaque session token**, stored
  **hashed** server-side (migration 014).
- **Sync protocol:** *pull-since-timestamp* + *push*. Each record carries `updatedAt`;
  conflicts resolve **last-write-wins per record** by that timestamp. Deletes travel as
  **tombstones** (`deletedAt`), which is why the client soft-deletes under sync
  (Section 28). Routes in `server/src/http/routes/sync.ts`.
- **Client side:** `src/lib/syncClient.ts` (protocol), `src/hooks/useAutoSync.ts` +
  `src/components/AutoSync.tsx` (background loop), `src/components/SyncSettingsPanel.tsx`
  and `SyncConflicts.tsx` (Settings UI), `src/lib/settingsSync.ts`,
  `src/lib/syncConflicts.ts`.
- **Deployment:** `server/Dockerfile` builds an OCI image (Podman or Docker);
  `server/docker-compose.yml` for a quick stand-up. Designed to run on anything from a
  Raspberry Pi to a small VPS. **Point the app at an HTTPS URL** — see the
  `capacitor.config.ts` comment about why cleartext HTTP is off by default.

To try it locally:

```sh
cd server
npm install
npm run build
node dist/cli/create-user.js        # follow prompts to make an account
node dist/index.js                  # starts the API (default port in server/src/config.ts)
```

Then in the app: Settings → sync → enter the URL + credentials.

**Try it:** read `docs/self-hosted-sync.md` end to end. It's the design document for
the hardest part of the system and explains decisions (opaque tokens, LWW, no signup)
you'd otherwise have to reverse-engineer.

## 28. Soft delete and last-write-wins sync

Why the generic hook branches on `isConnected()`:

- **Offline:** `remove(id)` hard-deletes the row. Simple, no downside.
- **Under sync:** hard-deleting is wrong — the next full pull from the server would just
  re-add the record, because "absent locally" and "deleted" are indistinguishable. So
  `remove` instead writes a **tombstone**: `{ ...record, deletedAt: now, updatedAt: now }`.
  `src/lib/softDelete.ts`'s `isLiveRecord` filters tombstones out of every in-memory
  view, so the UI still shows the thing as gone. The tombstone syncs to the server;
  once the server has it, `syncClient` **compacts** it away locally. `SEED_IDS` protects
  a tombstone for a *seed* item from being compacted (or the seed would reappear).
- **Conflict resolution:** if two devices edit the same record while offline, whichever
  has the later `updatedAt` wins when they next sync. Coarse, but predictable, and fine
  for a single user's own devices. `src/lib/syncConflicts.ts` surfaces notable
  conflicts in Settings.

`updatedAt` is stamped on **every** `create`/`update`, sync configured or not — so the
watermark already exists the day you first connect a server.

## 29. Packaging as an Android app with Capacitor

`capacitor.config.ts` sets `appId: 'com.mattiacinelli.workoutbuddy'`, `webDir: 'dist'`.
The `android/` project is checked in. Capacitor copies `dist/` into it and wraps it in a
full-screen WebView.

**Prerequisites:** Android Studio + Android SDK, Build-Tools 35.0.0, Java 21 (Android
Studio bundles a compatible JDK).

**macOS: point Gradle at Android Studio's JDK** (add to `~/.zshrc` to persist):

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

**Build + run:**

```sh
npm run build
npx cap add android      # first time only; skip if android/ exists
npx cap sync android     # copies dist/ + native plugin config into android/
npx cap run android      # or: open android/ in Android Studio and Run
```

`npm run android:sync` chains `build` + `cap sync`; `npm run android:open` also opens
Android Studio. **Always `npm run build` before `cap sync`** — Capacitor copies the
*current* `dist/`.

**Native plugins in use:** `@capacitor/local-notifications` (reminders),
`@capacitor/filesystem` + `@capacitor/share` (backup file), `@capacitor/haptics` and
`@capacitor-community/text-to-speech` (guided cues). After installing any plugin, run
`npx cap sync android`.

**Cleartext HTTP** for a LAN-only sync box is off by default (token + data would travel
unencrypted). Opt in per build with `WB_ALLOW_INSECURE_SYNC=1 npm run android:sync`, or
permanently on your machine with `touch android/.allow-insecure-sync` (git-ignored, so
release builds stay HTTPS-only).

**Troubleshooting** (`docs/development.md` has more):
- `Unable to locate a Java Runtime` → set `JAVA_HOME` as above, new terminal.
- `ZipException: invalid block type` installing Build-Tools 35 → the SDK archive is
  corrupt; uninstall and reinstall Build-Tools 35.0.0 in the SDK Manager.

**Try it:** even without a device, run `npm run android:sync` and open `android/` in
Android Studio — the emulator is enough to see the wrapped app.

## 30. CI/CD and releases

**`.github/workflows/ci.yml`** — on every push/PR to `main`:
- **verify:** Node 22 → `npm ci` → `lint` → `tsc --noEmit` → `test:unit` → `build` →
  assert `dist/sw.js` + `dist/manifest.webmanifest` exist and the Lovable script is
  gone → `playwright install` → `test:e2e` (uploads the report on failure).
- **server:** `cd server && npm ci && npm run build && npm test`.

**`.github/workflows/android-release.yml`** — on pushing a tag like `v0.2.0`:
- Node 22 + Java 21 → `npm ci` → `npm version` to the tag → `npm run android:sync`.
- Validates four repo **secrets** exist:
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD`.
- Decodes the keystore, runs `./gradlew assembleRelease`, renames the APK to
  `workout-buddy-v0.2.0.apk`, and creates/updates a **GitHub Release** with it attached.
- Android's internal `versionCode` = the workflow run number (monotonic).

**One-time signing setup** (do this outside the repo, back it up — losing the `.jks`
means future releases can't update existing installs):

```sh
keytool -genkeypair -v -keystore workout-buddy-release.jks \
  -alias workout-buddy -keyalg RSA -keysize 2048 -validity 10000
```

Put the four values in **GitHub → Settings → Secrets and variables → Actions**
(`ANDROID_KEYSTORE_BASE64` = `base64 < workout-buddy-release.jks | tr -d '\n'`).

**Cut a release:**

```sh
git tag v0.2.0
git push origin v0.2.0
```

Follows **Keep a Changelog** + **SemVer** — update `CHANGELOG.md` and bump the version.
Use a new, increasing version every time.

**There is no web deploy workflow in the repo** — the web build (`dist/`) is a static
folder you can host anywhere (GitHub Pages, Netlify, a static bucket, your own nginx).
`npm run build` then upload `dist/`.

---

# Part VII — Working the way this app was made

## 31. This app was built with an LLM — how to keep doing that well

The tells are in the repo: `index.html` loads `cdn.gpteng.co/gptengineer.js`,
`vite.config.ts` has a `lovable-tagger` plugin and a dedicated plugin to **strip the
Lovable editor script from production builds**, and `README`/`docs` mention the "Lovable
in-browser editor". This project was scaffolded and substantially built in **Lovable**
(an AI app builder) and then hardened by hand and with coding agents.

You do **not** need Lovable to keep working on it. Any capable coding assistant (Claude
Code, Cursor, etc.) works against this repo directly. What makes *this* codebase pleasant
to extend with an LLM — and what you should preserve:

### Why this repo is "LLM-friendly"

1. **One obvious way to do each thing.** Data access is always `useData()`. Persistence
   is always a domain hook over `useIndexedDBCollection`. Styling is always semantic
   tokens. An assistant can pattern-match a new feature onto an existing one.
2. **The `docs/` folder is a spec.** `overview.md` (intent), `architecture.md` (layers +
   rules), `data-model.md` (every field + rationale), `development.md` (recipes +
   "gotchas seen in this codebase"). Point the assistant at these first.
3. **Small, pure modules with sibling tests.** `src/lib/*.ts` + `*.test.ts`. Logic is
   isolated from React, so it's easy to generate, verify, and regenerate.
4. **Tight, fast feedback.** `tsc --noEmit`, `vitest`, `eslint`, `playwright` — an
   assistant (or you) can check its own work in seconds.
5. **Guardrails at the trust boundary.** zod on imports, the Lovable-script stripper,
   referential-integrity checks, `imageUrl` scheme allow-list. Generated code can't
   quietly weaken these because tests cover them.

### How to prompt effectively against this codebase

- **Give it the map.** "Read `docs/architecture.md` and `docs/development.md`. I want to
  add X. Follow the existing pattern in `useCourses.ts` / `Calendar.tsx`."
- **Name the layer.** "This is pure logic — put it in `src/lib/` with a `*.test.ts`, not
  in the component."
- **Point at a sibling to copy.** "Model `useGoals` on `useWorkouts`." The recipes in
  Part V are written exactly this way.
- **Demand the checks.** "Then run `npx tsc --noEmit -p tsconfig.app.json`,
  `npm run test:unit`, and `npm run lint` and fix anything."
- **Constrain styling.** "Semantic tokens only — no `bg-gray-*`, no hex. Verify in dark
  mode."
- **Keep changes small.** One entity, one page, one recipe at a time. Review the diff.
- **Update the docs and `CHANGELOG.md` in the same change** — that's what keeps the next
  session productive.

### What to review by hand in LLM-written diffs

- A component importing from `src/lib/db.ts` directly (should be `useData()`).
- A hook that both pushes locally *and* refetches (→ duplicate items).
- History/streak code reading `workouts` instead of `sessions`.
- Course completion keyed on `workoutId` instead of `courseItemId`.
- Hardcoded colours.
- A `new Date()` arithmetic instead of `date-fns`.
- A required new field with no thought for existing records.
- Missing `AlertDialog` on a destructive action.
- No test for a new user-visible flow.

These are exactly the "Gotchas seen in this codebase" list in `docs/development.md` —
that list exists *because* they recur.

## 32. A learning path: 3 months from here

**Weeks 1–2 — read and run.**
- Do every "Try it" in Parts I–III.
- Read `src/hooks/useIndexedDBCollection.ts` and both `useExercises.ts` /
  `useWorkouts.ts` until you can explain them without looking.
- Read `src/App.tsx` and one page top to bottom (`Workouts.tsx`).
- Make 5 trivial changes: a label, a default value, a new nav icon, a token tweak, a
  new column in a list. Run the checks each time.

**Weeks 3–4 — logic without UI.**
- Read `workoutRuntime.ts` + its test. Add a rule (e.g. a configurable prep duration)
  test-first.
- Read `recurrence.ts` + its test. Add "monthly" recurrence: new `RecurrenceType`
  value, expansion branch, tests, then the form option.
- Read `progression.ts`, `personalRecords.ts`, `muscleGroupVolume.ts` — small, pure,
  well-tested; good models for your own.

**Weeks 5–6 — a full vertical feature.**
- Implement the `Goal` entity from Recipe 23 end to end: type, `db.ts` + `DB_VERSION`
  bump, hook, context, a `/goals` page, nav link, unit + hook + e2e tests, docs +
  changelog. This exercises every layer.

**Weeks 7–8 — the platform.**
- Get the Android build running on an emulator (Section 29).
- Stand up the sync server locally (Section 27), create a user, sync two browser
  profiles, force a conflict, watch LWW resolve it.
- Read `docs/self-hosted-sync.md` fully.

**Weeks 9–12 — own a hard part.**
- Pick one: improve conflict resolution (field-level merge instead of LWW), add a new
  Capacitor plugin (e.g. widget / share-target), add a second chart type with proper
  `chartA11y` support, or implement a web deploy workflow.
- Write the design note in `docs/` *first*, the way `self-hosted-sync.md` was written.

By the end you'll have touched React, TypeScript, IndexedDB, service workers, a Node
API, SQLite, native packaging, and CI — which is a complete modern app-development
skill set, learned on a real codebase instead of a toy.

## 33. Glossary

| Term | Meaning here |
| --- | --- |
| **SPA** | Single-page app: one HTML load, JS swaps the view. |
| **PWA** | Progressive Web App: installable, offline-capable web app (service worker + manifest). |
| **Service worker** | A script the browser runs in the background to intercept network requests and serve cached assets. Enables offline. Here: generated by Workbox, only in the build. |
| **IndexedDB** | The browser's built-in object database. The app's source of truth. |
| **Object store** | An IndexedDB "table". Seven here, keyed by `id`. |
| **`idb`** | The small promise wrapper over IndexedDB used in `db.ts`. |
| **Hook** | A `useX` function sharing stateful logic. |
| **Context** | React's mechanism for whole-tree shared state. One here: `DataContext`. |
| **Domain hook** | `useExercises` etc. — one collection's in-memory copy + operations. |
| **Seed data** | The starter content in `src/data/*.ts`, written on first run. |
| **Seed migration** | Additively giving existing installs newly-added seed items (`seedVersion.ts` + `SEED_VERSION`). |
| **Tombstone** | A record marked `deletedAt` instead of removed, so a deletion can sync. |
| **LWW** | Last-write-wins: conflict resolution by newest `updatedAt`. |
| **Template (`WorkoutEntry`)** | An editable workout plan. |
| **Session (`WorkoutSession`)** | An immutable completion record. History reads only these. |
| **Step (`WorkoutStep`)** | One unit of the guided runner: an exercise or a rest, always with a duration. |
| **Expansion** | Turning a recurrence *rule* into concrete dated occurrences at read time. |
| **Semantic token** | A named CSS variable (`--background`, `--primary`) used via Tailwind so themes work. |
| **Capacitor** | Wraps the web build as a native Android app. |
| **shadcn/ui** | Component source files copied into `src/components/ui/` (not an npm dependency). |
| **Radix** | The unstyled accessible primitives shadcn/ui builds on. |
| **Vite** | The dev server / bundler. |
| **Vitest / Playwright** | Unit+hook test runner / end-to-end browser test runner. |

## 34. Troubleshooting index

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `npm run dev` — blank page, module errors | stale deps | delete `node_modules/` + `package-lock.json`, `npm install` |
| Duplicate item after creating one | a hook pushing locally *and* refetching | pick one; the hooks update state optimistically after the DB write |
| "Workout not found" on a detail page | page reading a static array from `src/data/` instead of `useData()` | use `useData()` |
| A page renders white in dark mode | a hardcoded Tailwind grey on that page's root | replace with a semantic token |
| History changes when you create a template | code reading `workouts` where it should read `sessions` | read `sessions` |
| A repeated course workout completes twice | completion keyed on `workoutId` | key on `courseItemId` |
| Delete fails with a "referenced by…" message | referential-integrity guard (Section 18) | remove the references first, or don't delete |
| e2e fails only in `sync.spec.ts` | throwaway sync server didn't boot | check `e2e/support/sync-server.mjs`, port 3999 free |
| `tsc` errors after adding a field | interface not updated, or field made required | add to the `src/data/*.ts` interface, keep it optional |
| Android: `Unable to locate a Java Runtime` | `JAVA_HOME` unset | export Android Studio's `jbr` path (Section 29) |
| Android: `ZipException: invalid block type` | corrupt Build-Tools 35 download | reinstall Build-Tools 35.0.0 in SDK Manager |
| Service worker serving old code | `registerType: 'prompt'` — waiting for you | accept the "Update available" toast, or unregister the SW in DevTools |
| Sync token visible / insecure | pointed at an `http://` server | use HTTPS; cleartext is a deliberate opt-in only |

---

### Where to go next

- `docs/overview.md` — the product intent and non-goals, in the authors' words.
- `docs/architecture.md` — the same layers as Part III, condensed, plus the exact rules.
- `docs/data-model.md` — every field of every entity and why it's shaped that way.
- `docs/development.md` — the terse version of Part V, plus the manual release checklist.
- `docs/self-hosted-sync.md` — the full design of the sync server.
- `docs/workout-audio.md` — the guided-workout audio system in detail.
- `CHANGELOG.md` — what changed, release by release.

Read the code with this guide open beside it. The app is small enough to hold in your
head — that was the point.
