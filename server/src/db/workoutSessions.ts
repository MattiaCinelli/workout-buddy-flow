import { Db } from './index';
import { SyncedWorkoutSet } from './workouts';

export interface SyncedWorkoutSetResult {
  exerciseId: string;
  setIndex: number;
  completed: boolean;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

export interface SyncedWorkoutSession {
  id: string;
  workoutId: string;
  date: string;
  title: string;
  duration: number;
  category: string;
  sets: SyncedWorkoutSet[];
  restBetweenExercises?: number;
  notes?: string;
  completedAt: string;
  plannedDuration: number;
  courseId?: string;
  courseItemId?: string;
  scheduledWorkoutId?: string;
  actualSets?: SyncedWorkoutSetResult[];
  perceivedExertion?: number;
  completionNotes?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface WorkoutSessionRow {
  id: string;
  workout_id: string;
  date: string;
  title: string;
  duration: number;
  category: string;
  sets: string;
  rest_between_exercises: number | null;
  notes: string | null;
  completed_at: string;
  planned_duration: number;
  course_id: string | null;
  course_item_id: string | null;
  scheduled_workout_id: string | null;
  actual_sets: string | null;
  perceived_exertion: number | null;
  completion_notes: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: WorkoutSessionRow): SyncedWorkoutSession => ({
  id: row.id,
  workoutId: row.workout_id,
  date: row.date,
  title: row.title,
  duration: row.duration,
  category: row.category,
  sets: JSON.parse(row.sets),
  restBetweenExercises: row.rest_between_exercises ?? undefined,
  notes: row.notes ?? undefined,
  completedAt: row.completed_at,
  plannedDuration: row.planned_duration,
  courseId: row.course_id ?? undefined,
  courseItemId: row.course_item_id ?? undefined,
  scheduledWorkoutId: row.scheduled_workout_id ?? undefined,
  actualSets: row.actual_sets ? JSON.parse(row.actual_sets) : undefined,
  perceivedExertion: row.perceived_exertion ?? undefined,
  completionNotes: row.completion_notes ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedWorkoutSession[] => {
  const rows = since
    ? db.prepare('SELECT * FROM workout_sessions WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as WorkoutSessionRow[]
    : db.prepare('SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY synced_at').all(userId) as WorkoutSessionRow[];
  return rows.map(fromRow);
};

export const upsertWorkoutSession = (db: Db, userId: string, session: SyncedWorkoutSession): SyncedWorkoutSession => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO workout_sessions (
      id, user_id, workout_id, date, title, duration, category, sets,
      rest_between_exercises, notes, completed_at, planned_duration,
      course_id, course_item_id, scheduled_workout_id, actual_sets,
      perceived_exertion, completion_notes, updated_at, deleted_at, synced_at
    )
    VALUES (
      @id, @userId, @workoutId, @date, @title, @duration, @category, @sets,
      @restBetweenExercises, @notes, @completedAt, @plannedDuration,
      @courseId, @courseItemId, @scheduledWorkoutId, @actualSets,
      @perceivedExertion, @completionNotes, @updatedAt, @deletedAt, @syncedAt
    )
    ON CONFLICT(id, user_id) DO UPDATE SET
      workout_id = excluded.workout_id,
      date = excluded.date,
      title = excluded.title,
      duration = excluded.duration,
      category = excluded.category,
      sets = excluded.sets,
      rest_between_exercises = excluded.rest_between_exercises,
      notes = excluded.notes,
      completed_at = excluded.completed_at,
      planned_duration = excluded.planned_duration,
      course_id = excluded.course_id,
      course_item_id = excluded.course_item_id,
      scheduled_workout_id = excluded.scheduled_workout_id,
      actual_sets = excluded.actual_sets,
      perceived_exertion = excluded.perceived_exertion,
      completion_notes = excluded.completion_notes,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > workout_sessions.updated_at
  `).run({
    id: session.id,
    userId,
    workoutId: session.workoutId,
    date: session.date,
    title: session.title,
    duration: session.duration,
    category: session.category,
    sets: JSON.stringify(session.sets),
    restBetweenExercises: session.restBetweenExercises ?? null,
    notes: session.notes ?? null,
    completedAt: session.completedAt,
    plannedDuration: session.plannedDuration,
    courseId: session.courseId ?? null,
    courseItemId: session.courseItemId ?? null,
    scheduledWorkoutId: session.scheduledWorkoutId ?? null,
    actualSets: session.actualSets ? JSON.stringify(session.actualSets) : null,
    perceivedExertion: session.perceivedExertion ?? null,
    completionNotes: session.completionNotes ?? null,
    updatedAt: session.updatedAt,
    deletedAt: session.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?')
    .get(session.id, userId) as WorkoutSessionRow;
  return fromRow(row);
};

export const upsertWorkoutSessionsBatch = (
  db: Db,
  userId: string,
  sessions: SyncedWorkoutSession[]
): SyncedWorkoutSession[] => {
  const applyAll = db.transaction((items: SyncedWorkoutSession[]) =>
    items.map(item => upsertWorkoutSession(db, userId, item))
  );
  return applyAll(sessions);
};
