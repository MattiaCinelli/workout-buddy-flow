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
}
```

Notes:
- Names are validated as unique (case-insensitive) when creating.
- Uploaded images are read in the browser and stored inline, capped at ~5 MB, so they
  keep working offline.
- `exerciseList` is the starter library seeded on first run.

## Workout — `src/data/workoutHistory.ts`

```ts
interface WorkoutSet {
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number;    // seconds — used by cardio / flexibility / holds
  distance?: number;    // meters
  restAfter?: number;   // seconds of rest after this set
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
inherited `duration` is the actual elapsed time in minutes.

## Backup format — `src/lib/backup.ts`

Backups are versioned JSON documents containing all five object-store collections.
Restore validates the format, version, arrays and record IDs before opening one
read/write transaction that replaces all stores together. On Android, the backup is
written to the cache directory and handed to the native share sheet; on the web it is
downloaded as a `.json` file.

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
  createdAt: string;
}
```

Stored as a **rule**. `useScheduledWorkouts` expands rules into
`ExpandedScheduledWorkout` (`+ displayDate`) for any requested date range, so editing
or deleting one record changes the whole series.

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
