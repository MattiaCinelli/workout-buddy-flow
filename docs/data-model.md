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

There is no separate "template" vs "log" type — the same record is both the plan and
the history entry, which is why it carries a `date`.

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
  workoutId: string;
  order: number;        // position in the progression
  completed: boolean;
  completedAt?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  workouts: CourseWorkout[];
  createdAt: string;
  startedAt?: string;   // set by startCourse()
  completedAt?: string; // set when every workout is completed
}
```

Progression is sequential: the next workout is the lowest-`order` entry with
`completed === false`. Completion is manual (the user presses "Complete"), and
`restartCourse` resets all flags so a program can be repeated.
