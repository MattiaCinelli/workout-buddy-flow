# Architecture

## Stack

- **React 18 + TypeScript**, bundled by **Vite**
- **React Router** for page routing
- **Tailwind CSS + shadcn/ui** for styling and components (semantic design tokens in `src/index.css`)
- **idb** (IndexedDB wrapper) as the persistence layer
- **date-fns** for date maths (calendar, recurrence, streaks)
- **Recharts** for progress charts
- **Capacitor** for packaging the same build as an Android app

## Layers

```text
  Pages (src/pages)                 route-level screens
        |  useData()
  DataContext (src/contexts)        single provider exposing all app state
        |
  Hooks (src/hooks)                 useExercises / useWorkouts / useWorkoutSessions /
        |                           useScheduledWorkouts / useCourses
  DB helpers (src/lib/db.ts)        typed CRUD over IndexedDB
        |
  IndexedDB "workout-buddy-db"      persisted on device
```

Rules of thumb:

- **Pages and components never touch `src/lib/db.ts` directly.** They call `useData()`.
- **Hooks own the in-memory copy** of each collection and keep it in sync with IndexedDB
  after every write (write to DB first, then update React state).
- **`src/data/*.ts`** contains only TypeScript types plus the default seed data.

## The data layer (`src/lib/db.ts`)

One IndexedDB database, `workout-buddy-db`, with seven object stores, each keyed by `id`:

| Store | Type | Added in DB version |
| --- | --- | --- |
| `exercises` | `Exercise` | 1 |
| `workouts` | `WorkoutEntry` | 1 |
| `scheduledWorkouts` | `ScheduledWorkout` | 2 |
| `courses` | `Course` | 3 |
| `workoutSessions` | `WorkoutSession` | 4 |
| `muscleGroups` | `MuscleGroup` | 5 |
| `bodyMetrics` | `BodyMetric` | 6 |

`getDB()` lazily opens the database once and memoises the promise. The `upgrade`
callback creates any store that does not yet exist, so bumping `DB_VERSION` and adding
another `if (!db.objectStoreNames.contains(...))` block is all that a new store needs —
existing user data is never dropped. Course records from the earlier schema are
normalized in `useCourses` with unique item IDs and week/day defaults when loaded.

The one optional user-supplied workout backing track lives in a **separate** IndexedDB
database, `workout-buddy-audio` (`src/lib/customAudio.ts`), so a multi-MB blob never
enters the sync or backup path.

### Seeding and seed migration

A hook with `defaults` seeds them when its store is empty (fresh install). With a
`seedKey` as well, `src/lib/seedVersion.ts` also lets **existing** installs pick up
defaults added later: bump `SEED_VERSION` when a `src/data/*.ts` list gains entries,
and on next load each device additively inserts any default id it has never seen. It
never touches a record the user edited or deleted — a deleted seed item leaves a
tombstone row, and `SEED_IDS` keeps sync from compacting that tombstone away.

### Soft delete under sync

When a sync server is connected, `remove`/`clearAll` write a `deletedAt` tombstone
instead of hard-deleting, so the deletion propagates and the record cannot resurrect on
a later full pull. `src/lib/softDelete.ts`; tombstones are filtered from every
in-memory view and compacted by `syncClient` once the server has them.

DB helpers are intentionally small: collections expose the reads, upserts, deletes,
bulk writes, or clears required by their hook. Writes use IndexedDB `put`, making them
safe upserts by entity ID.

## State management (`src/contexts/DataContext.tsx`)

`DataProvider` calls the seven domain hooks once, near the root of the app, and republishes
their values on a single context. Consumers use:

```ts
const { workouts, createWorkout, isLoading } = useData();
```

This means one shared copy of the data for the whole app: creating a workout in a modal
is immediately visible on the dashboard, calendar and course pages.

The context also enforces referential deletion rules. An exercise cannot be deleted
while templates or completed sessions contain it, and a workout cannot be deleted
while history, courses or calendar records reference it. This prevents dangling IDs.

`useData()` throws if used outside the provider, which keeps mistakes loud.

## Domain hooks

- **`useExercises`** — loads the library; if the store is empty it seeds it with
  `exerciseList` from `src/data/exercises.ts` so a fresh install is not blank.
- **`useWorkouts`** — owns reusable workout templates and exposes template CRUD plus
  `fetchWorkoutById` for pages that need a fresh DB value.
- **`useWorkoutSessions`** — owns completed-session snapshots. Guided mode writes one
  session after the final step; history, streaks, goals and progress charts consume
  this collection. `clearAllSessions` clears history without deleting templates.
- **`useScheduledWorkouts`** — stores *rules*, not occurrences. A record has a
  `startDate`, `recurrence` (`none` / `daily` / `weekly`), optional `recurrenceDay` and
  optional `endRecurrenceDate`. `getScheduledWorkoutsForRange` / `...ForDate` expand
  those rules into `ExpandedScheduledWorkout` instances (each carrying a concrete
  `displayDate`) for the calendar to render. Nothing recurring is ever written per-day.
- **`useCourses`** — a course holds ordered workout/recovery items with unique IDs and
  week/day placement. `startCourse` stamps `startedAt`; guided completion marks the
  exact workout item, while recovery days are completed explicitly. The hook stamps
  `completedAt` on the course when all items are done,
  `getNextWorkoutInCourse` returns the first uncompleted entry, and `restartCourse`
  clears all completion flags.
- **`useMuscleGroups`** — owns editable exercise tags and seeds the standard groups on
  a fresh database. Group IDs remain stable when their display names are changed.
- **`useBodyMetrics`** — owns dated body-weight measurements and keeps them ordered for
  progress charts.

## Routing (`src/App.tsx`)

| Route | Screen |
| --- | --- |
| `/` | Dashboard (calendar preview, today's focus, streak, weekly goal, stats) |
| `/exercises` | Exercise library management |
| `/workouts` | All saved workouts |
| `/workout/:id` | Workout detail (edit / delete / start) |
| `/workout/:id/start` | Full-screen guided workout presentation |
| `/calendar` | Weekly & monthly scheduling views |
| `/courses`, `/courses/:id`, `/courses/:id/edit` | Course list, detail, editor |
| `/history` | Filterable past sessions |
| `/progress` | Charts, streaks, clear-history action |
| `/settings` | Sync, account, reminders, appearance, backup/restore and app information |
| `*` | Not found |

Custom routes must be added **above** the catch-all `*` route.

## Offline / PWA

The installed Android app (Capacitor) serves its own assets and is offline-capable by
construction. For the **web** build, `public/manifest.webmanifest` makes it installable
and `public/sw.js` (registered from `src/main.tsx`, prod only) is a network-first
service worker that caches whatever loads, so a later visit opens offline. App data is
IndexedDB and is untouched by the service worker.

## Third-party code / trust boundary

The app ships **no** third-party runtime code and makes no outbound requests except to
a sync server the user configures. `index.html` carries the Lovable in-browser-editor
script (`cdn.gpteng.co`); a Vite plugin (`stripLovableEditorScript` in
`vite.config.ts`, `apply: 'build'`) removes it from every `vite build`, so it exists
only during `vite` dev. Imported backup / share files are validated for shape and their
`imageUrl` is constrained to `https:` or an `image/*` data URI (`src/lib/backup.ts`);
CSV export escapes leading `= + - @` to prevent spreadsheet formula injection.

## Styling conventions

Colours, gradients and shadows are **semantic tokens** defined in `src/index.css` and
consumed through Tailwind (`bg-background`, `text-foreground`, `text-muted-foreground`,
`bg-primary`, …). Hardcoded utilities such as `bg-gray-50` or `text-white` break dark
mode and have caused real bugs in this project — do not reintroduce them.

Theme switching lives in `src/hooks/useTheme.ts` and `src/components/ThemeToggle.tsx`
(toggles the `dark` class on the document root, persisted locally).

## Guided-workout audio

Optional background music during a guided workout — either a generated Web Audio
ambient bed (no asset, offline) or a user-supplied file stored in its own
IndexedDB database. Lives in `src/lib/ambientAudio.ts`, `src/lib/customAudio.ts`
and `src/hooks/useWorkoutMusic.ts`; see `docs/workout-audio.md` for the full
picture. Distinct from the guided-mode voice and haptic cues.

## Self-hosted sync (optional, in progress)

`server/` is a separate Node.js/TypeScript project — its own `package.json`, not part
of the Vite build — implementing an opt-in sync backend. It does not change anything
described above: the app's default data layer is still IndexedDB via `src/lib/db.ts`,
and the app works fully offline whether or not a sync server exists.

Full design rationale, schema, and build status live in
`docs/self-hosted-sync.md`. Summary: SQLite (`server/src/db`), admin-created accounts
only, opaque session tokens, and a pull-since-timestamp/push sync protocol with
last-write-wins conflict resolution per record.

## Completion flow

```text
Workout template / course item / calendar entry
                    |
                    v
        Guided workout presentation
                    |
                    v
        WorkoutSession written to IndexedDB
          |                         |
          v                         v
 History, charts, streaks     Exact course item completed
```
