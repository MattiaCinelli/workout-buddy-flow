# Data model

All types live in `src/data/`. Every entity uses a string `id` generated with
`crypto.randomUUID()`, and dates are stored as ISO strings so they survive
IndexedDB round-trips unchanged.

## Exercise — `src/data/exercises.ts`

```ts
interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'balance';
  muscleGroups: string[];      // optional in the form; may be empty
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl?: string;           // remote path or a base64 data URL from a phone photo
  unilateral?: boolean;        // runtime splits each set into left / right
  progression?: {              // opt-in; suggests the next target, never edits templates
    mode: 'linear' | 'double';
    incrementKg?: number;      // default 2.5
    repRangeMin?: number;      // 'double' only
    repRangeMax?: number;
  };
}
```

Notes:
- Names are validated as unique (case-insensitive) when creating.
- Uploaded images are read in the browser and stored inline, capped at ~5 MB, so they
  keep working offline.
- `exerciseList` is the starter library seeded on first run.
- **Progression** (`src/lib/progression.ts`, `suggestNextSet()`) is a pure suggestion
  layer: it reads the exercise policy + the logged history and proposes the next
  weight/reps, shown in the guided player's "last time" panel and on the per-exercise
  progress screen. It never writes a template or a session. `linear` adds weight when
  every set hit the target (and deloads ~10 % after two misses); `double` climbs the
  rep range first, then adds weight and resets to the bottom.

## Workout — `src/data/workoutHistory.ts`

```ts
interface WorkoutSet {
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number;    // seconds — used by cardio / flexibility / holds
  distance?: number;    // meters
  restAfter?: number;   // seconds of rest after this set
  warmup?: boolean;     // lighter prep set — excluded from records / volume / per-exercise history
  amrap?: boolean;      // "as many reps as possible": `reps` is a floor to beat, not a fixed count
}

interface WorkoutEntry {
  id: string;
  date: string;         // ISO date
  title: string;
  duration: number;     // minutes
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'mixed';
  sets: WorkoutSet[];
  restBetweenExercises?: number; // seconds, default gap between different exercises
  notes?: string;
}
```

Key idea: **a workout is a flat, ordered list of sets.** "3 sets of 12 bench press"
is three `WorkoutSet` entries with the same `exerciseId`. The UI groups consecutive
sets by exercise for display; the presentation player walks the flat list in order,
inserting rest steps from `restAfter` / `restBetweenExercises`.

`WorkoutEntry` is the reusable template. Finishing guided mode creates a separate
`WorkoutSession` record so merely creating or editing a template never changes history.

## Workout session — `src/data/workoutSessions.ts`

```ts
interface WorkoutSetResult {
  exerciseId: string;
  setIndex: number;
  completed: boolean;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  rpe?: number;          // 1–10, how hard that set actually felt (per-set)
  warmup?: boolean;      // copied from the plan so records/history filtering is self-contained
  amrap?: boolean;
}

interface WorkoutSession extends WorkoutEntry {
  workoutId: string;           // source template
  completedAt: string;         // actual completion timestamp
  plannedDuration: number;     // template estimate, in minutes
  courseId?: string;
  courseItemId?: string;
  scheduledWorkoutId?: string;
  actualSets?: WorkoutSetResult[]; // actual values plus completed/skipped state
  perceivedExertion?: number;      // RPE 1–10
  completionNotes?: string;
}
```

`WorkoutSession` snapshots the performed template (title, category and sets), records
the actual completion timestamp and elapsed duration, and optionally links back to a
course item or scheduled workout. History, streaks, weekly goals and progress charts
read only from sessions. Its inherited `date` is the completion timestamp and its
inherited `duration` is the actual elapsed time in minutes. The snapshot is normally
append-only, but the History correction dialog can update its timestamp, duration,
set results, exertion and notes when the user recorded something incorrectly. Deleting
a session linked to a course also reopens that exact course item.

## Backup format — `src/lib/backup.ts`

Backups are versioned JSON documents. **Version 3** carries the full app state: all
seven object-store collections (exercises, workout templates, workout sessions,
schedules, courses, muscle groups, body metrics), plus `preferences` (a whitelist of
device `localStorage` keys — theme, weekly goal, accessibility, reminders, height,
plate-calculator bar; sync credentials and seed markers are deliberately excluded) and
the optional custom workout `audioTrack` as a data URL. Restore validates each record
against a Zod schema (`src/lib/importSchemas.ts`) — malformed records and duplicate ids
are dropped and surfaced as warnings in the confirm dialog — then replaces the included
stores in one transaction and writes the preferences / audio track back. Legacy
version 1 and 2 files still restore (a v1 file leaves muscle groups and body metrics
untouched; v1/v2 carry no preferences). On Android the file goes to the cache directory
and the native share sheet; on the web it downloads as `.json`.

## Scheduled workout — `src/data/scheduledWorkouts.ts`

```ts
type RecurrenceType = 'none' | 'daily' | 'weekly';

interface ScheduledWorkout {
  id: string;
  workoutId: string;           // which workout to do
  startDate: string;           // YYYY-MM-DD
  startTime: string;           // HH:MM, 24h
  endTime?: string;
  recurrence: RecurrenceType;
  recurrenceDay?: WeekDay;     // for weekly recurrence
  endRecurrenceDate?: string;  // when the series stops
  notes?: string;
  skippedDates?: string[];      // concrete recurring occurrences intentionally skipped
  createdAt: string;
}
```

Stored as a **rule**. `useScheduledWorkouts` expands rules into
`ExpandedScheduledWorkout` (`+ displayDate`) for any requested date range, so editing
or deleting one record changes the whole series. A skipped occurrence stays visible
with a skipped state so it can be restored. Moving one recurring occurrence adds that
date to `skippedDates` and creates a new one-time schedule on the chosen date, leaving
the rest of the recurrence intact.

## Course — `src/data/courses.ts`

```ts
interface CourseWorkout {
  id: string;                    // unique program item; allows repeated workouts
  type: 'workout' | 'rest';
  workoutId?: string;            // absent for recovery days
  order: number;        // position in the progression
  week: number;
  day: number;                   // 1–7 within the week
  title?: string;                // e.g. "Active recovery"
  instructions?: string;         // targets, substitutions, recovery guidance
  completed: boolean;
  completedAt?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string;
  durationWeeks?: number;
  workouts: CourseWorkout[];
  createdAt: string;
  startedAt?: string;   // set by startCourse()
  completedAt?: string; // set when every workout is completed
}
```

Progression is sequential across workout sessions and recovery days. A workout may
appear multiple times because completion is keyed by the program item's own `id`, not
by `workoutId`. Older saved courses are normalized with IDs and schedule defaults when
loaded. Guided completion advances its linked workout item automatically; recovery
days are completed manually. `restartCourse` resets all flags.

## Relationships and deletion safety

```text
Exercise <- Workout template <- Scheduled workout
                         ^  <- Course item
                         ^  <- Workout session snapshot
```

IndexedDB does not enforce foreign keys. `DataContext` therefore blocks deletion when
references exist and returns a human-readable explanation. This favors data integrity
over cascading deletion of a user's schedule, program, or history.

## Schema evolution

The current IndexedDB version is **4**:

- Version 1: exercises and workouts
- Version 2: scheduled workouts
- Version 3: courses
- Version 4: workout sessions

Upgrades create missing stores without clearing existing ones. New optional fields do
not require an IndexedDB version bump; new stores do.
