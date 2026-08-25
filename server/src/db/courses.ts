import { Db } from './index';

export interface SyncedCourseWorkout {
  id: string;
  type: string;
  workoutId?: string;
  order: number;
  week: number;
  day: number;
  title?: string;
  instructions?: string;
  completed: boolean;
  completedAt?: string;
}

export interface SyncedCourse {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  difficulty?: string;
  prerequisites?: string;
  durationWeeks?: number;
  workouts: SyncedCourseWorkout[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  difficulty: string | null;
  prerequisites: string | null;
  duration_weeks: number | null;
  workouts: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: CourseRow): SyncedCourse => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  goal: row.goal ?? undefined,
  difficulty: row.difficulty ?? undefined,
  prerequisites: row.prerequisites ?? undefined,
  durationWeeks: row.duration_weeks ?? undefined,
  workouts: JSON.parse(row.workouts),
  createdAt: row.created_at,
  startedAt: row.started_at ?? undefined,
  completedAt: row.completed_at ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedCourse[] => {
  const rows = since
    ? db.prepare('SELECT * FROM courses WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as CourseRow[]
    : db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY synced_at').all(userId) as CourseRow[];
  return rows.map(fromRow);
};

export const upsertCourse = (db: Db, userId: string, course: SyncedCourse): SyncedCourse => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO courses (
      id, user_id, title, description, goal, difficulty, prerequisites,
      duration_weeks, workouts, created_at, started_at, completed_at, updated_at, deleted_at, synced_at
    )
    VALUES (
      @id, @userId, @title, @description, @goal, @difficulty, @prerequisites,
      @durationWeeks, @workouts, @createdAt, @startedAt, @completedAt, @updatedAt, @deletedAt, @syncedAt
    )
    ON CONFLICT(id, user_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      goal = excluded.goal,
      difficulty = excluded.difficulty,
      prerequisites = excluded.prerequisites,
      duration_weeks = excluded.duration_weeks,
      workouts = excluded.workouts,
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > courses.updated_at
  `).run({
    id: course.id,
    userId,
    title: course.title,
    description: course.description ?? null,
    goal: course.goal ?? null,
    difficulty: course.difficulty ?? null,
    prerequisites: course.prerequisites ?? null,
    durationWeeks: course.durationWeeks ?? null,
    workouts: JSON.stringify(course.workouts),
    createdAt: course.createdAt,
    startedAt: course.startedAt ?? null,
    completedAt: course.completedAt ?? null,
    updatedAt: course.updatedAt,
    deletedAt: course.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?')
    .get(course.id, userId) as CourseRow;
  return fromRow(row);
};

export const upsertCoursesBatch = (db: Db, userId: string, courses: SyncedCourse[]): SyncedCourse[] => {
  const applyAll = db.transaction((items: SyncedCourse[]) => items.map(item => upsertCourse(db, userId, item)));
  return applyAll(courses);
};
