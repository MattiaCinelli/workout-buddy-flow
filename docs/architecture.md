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
  Hooks (src/hooks)                 useExercises / useWorkouts /
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

One IndexedDB database, `workout-buddy-db`, with four object stores, each keyed by `id`:

| Store | Type | Added in DB version |
| --- | --- | --- |
| `exercises` | `Exercise` | 1 |
| `workouts` | `WorkoutEntry` | 1 |
| `scheduledWorkouts` | `ScheduledWorkout` | 2 |
| `courses` | `Course` | 3 |

`getDB()` lazily opens the database once and memoises the promise. The `upgrade`
callback creates any store that does not yet exist, so bumping `DB_VERSION` and adding
another `if (!db.objectStoreNames.contains(...))` block is all that a new store needs —
existing user data is never dropped.

Every store has the same helper shape: `getAllXFromDB`, `getXByIdFromDB`, `saveXToDB`
(an upsert via `put`), `deleteXFromDB`, and `bulkSaveXToDB`.

## State management (`src/contexts/DataContext.tsx`)

`DataProvider` calls the four hooks once, near the root of the app, and republishes
their values on a single context. Consumers use:

```ts
const { workouts, createWorkout, isLoading } = useData();
```

This means one shared copy of the data for the whole app: creating a workout in a modal
is immediately visible on the dashboard, calendar and course pages.

`useData()` throws if used outside the provider, which keeps mistakes loud.

## Domain hooks

- **`useExercises`** — loads the library; if the store is empty it seeds it with
  `exerciseList` from `src/data/exercises.ts` so a fresh install is not blank.
- **`useWorkouts`** — loads and keeps workouts sorted by date descending; also exposes
  `clearAllWorkouts` (used by the "clear history" action) and `fetchWorkoutById` for
  pages that want a value straight from the DB.
- **`useScheduledWorkouts`** — stores *rules*, not occurrences. A record has a
  `startDate`, `recurrence` (`none` / `daily` / `weekly`), optional `recurrenceDay` and
  optional `endRecurrenceDate`. `getScheduledWorkoutsForRange` / `...ForDate` expand
  those rules into `ExpandedScheduledWorkout` instances (each carrying a concrete
  `displayDate`) for the calendar to render. Nothing recurring is ever written per-day.
- **`useCourses`** — a course holds `workouts: CourseWorkout[]` with `order` and
  `completed`. `startCourse` stamps `startedAt`, `completeWorkoutInCourse` marks one
  entry done (and stamps `completedAt` on the course when all are done),
  `getNextWorkoutInCourse` returns the first uncompleted entry, and `restartCourse`
  clears all completion flags.

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
| `*` | Not found |

Custom routes must be added **above** the catch-all `*` route.

## Styling conventions

Colours, gradients and shadows are **semantic tokens** defined in `src/index.css` and
consumed through Tailwind (`bg-background`, `text-foreground`, `text-muted-foreground`,
`bg-primary`, …). Hardcoded utilities such as `bg-gray-50` or `text-white` break dark
mode and have caused real bugs in this project — do not reintroduce them.

Theme switching lives in `src/hooks/useTheme.ts` and `src/components/ThemeToggle.tsx`
(toggles the `dark` class on the document root, persisted locally).
