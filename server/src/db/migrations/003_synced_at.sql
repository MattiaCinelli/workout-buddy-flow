-- Fixes a real bug found in production use: listChangedSince was filtering
-- by updated_at, which is the CLIENT's edit timestamp, not when the row
-- actually arrived on the server. If device A edits a record at T1 but
-- doesn't push until T3, and device B already synced (and set its
-- watermark) at T2 where T1 < T2 < T3, device B's next pull
-- (`WHERE updated_at > T2`) permanently misses that record — its
-- updated_at (T1) is before B's watermark even though the row only landed
-- on the server after B last synced. This is not an edge case; it happens
-- any time one device pushes later than another device's last sync, which
-- is the normal case, not a rare one.
--
-- synced_at is stamped with the SERVER's own clock at write time,
-- independent of whatever updated_at the client sends, and is what
-- listChangedSince now filters and orders by. updated_at is untouched and
-- keeps its existing job: last-write-wins conflict resolution between two
-- concurrent edits.
ALTER TABLE exercises ADD COLUMN synced_at TEXT;
ALTER TABLE workouts ADD COLUMN synced_at TEXT;
ALTER TABLE scheduled_workouts ADD COLUMN synced_at TEXT;
ALTER TABLE courses ADD COLUMN synced_at TEXT;
ALTER TABLE workout_sessions ADD COLUMN synced_at TEXT;

-- Rows written before this migration have synced_at = NULL, and
-- `synced_at > since` is never true against NULL — so without this
-- backfill, every row that existed before this migration would silently
-- vanish from every future pull, for every device, forever. updated_at is
-- the best available approximation of when they were last written.
UPDATE exercises SET synced_at = updated_at WHERE synced_at IS NULL;
UPDATE workouts SET synced_at = updated_at WHERE synced_at IS NULL;
UPDATE scheduled_workouts SET synced_at = updated_at WHERE synced_at IS NULL;
UPDATE courses SET synced_at = updated_at WHERE synced_at IS NULL;
UPDATE workout_sessions SET synced_at = updated_at WHERE synced_at IS NULL;

DROP INDEX idx_exercises_user_updated;
DROP INDEX idx_workouts_user_updated;
DROP INDEX idx_scheduled_workouts_user_updated;
DROP INDEX idx_courses_user_updated;
DROP INDEX idx_workout_sessions_user_updated;

CREATE INDEX idx_exercises_user_synced ON exercises(user_id, synced_at);
CREATE INDEX idx_workouts_user_synced ON workouts(user_id, synced_at);
CREATE INDEX idx_scheduled_workouts_user_synced ON scheduled_workouts(user_id, synced_at);
CREATE INDEX idx_courses_user_synced ON courses(user_id, synced_at);
CREATE INDEX idx_workout_sessions_user_synced ON workout_sessions(user_id, synced_at);
