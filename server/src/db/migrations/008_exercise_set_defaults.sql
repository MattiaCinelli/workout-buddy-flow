-- Exercises can now say how a set of them is measured (reps vs a timed
-- hold) and what the usual sets/reps/duration/weight/distance are, so
-- adding one to a workout pre-fills from the exercise itself instead of a
-- blanket category-based guess. All nullable: exercises created before this
-- existed fall back to a category-based guess client-side (see
-- getLogType in src/data/exercises.ts) rather than needing a backfill here.
ALTER TABLE exercises ADD COLUMN log_type TEXT;
ALTER TABLE exercises ADD COLUMN default_sets INTEGER;
ALTER TABLE exercises ADD COLUMN default_reps INTEGER;
ALTER TABLE exercises ADD COLUMN default_duration INTEGER;
ALTER TABLE exercises ADD COLUMN default_weight REAL;
ALTER TABLE exercises ADD COLUMN default_distance REAL;
