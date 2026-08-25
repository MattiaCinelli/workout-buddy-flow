-- Same shape as exercises (001_init.sql) for every table: composite
-- (id, user_id) primary key, updated_at for the sync watermark, deleted_at
-- as a tombstone. Nested arrays (sets, workouts, actual_sets) are stored as
-- JSON text, same treatment as exercises.muscle_groups.

CREATE TABLE workouts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  category TEXT NOT NULL,
  sets TEXT NOT NULL,
  rest_between_exercises INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_workouts_user_updated ON workouts(user_id, updated_at);

CREATE TABLE scheduled_workouts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  recurrence TEXT NOT NULL,
  recurrence_day TEXT,
  end_recurrence_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_scheduled_workouts_user_updated ON scheduled_workouts(user_id, updated_at);

CREATE TABLE courses (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  difficulty TEXT,
  prerequisites TEXT,
  duration_weeks INTEGER,
  workouts TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_courses_user_updated ON courses(user_id, updated_at);

CREATE TABLE workout_sessions (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  category TEXT NOT NULL,
  sets TEXT NOT NULL,
  rest_between_exercises INTEGER,
  notes TEXT,
  completed_at TEXT NOT NULL,
  planned_duration INTEGER NOT NULL,
  course_id TEXT,
  course_item_id TEXT,
  scheduled_workout_id TEXT,
  actual_sets TEXT,
  perceived_exertion INTEGER,
  completion_notes TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_workout_sessions_user_updated ON workout_sessions(user_id, updated_at);
