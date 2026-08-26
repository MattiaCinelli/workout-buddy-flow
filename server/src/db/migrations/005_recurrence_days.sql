-- recurrence_day stored a single weekday for weekly recurrence; the app now
-- lets a schedule repeat on several chosen weekdays (e.g. "every Mon/Wed/Fri",
-- or a Mon-Fri preset), so the column needs to hold a list, not one value.
-- Stored as JSON text, same treatment as every other array column
-- (workouts.sets, exercises.muscle_groups, etc). Weekday names are plain
-- lowercase words with no characters needing JSON escaping, so the backfill
-- can build the array with a plain string concat rather than json_array().
ALTER TABLE scheduled_workouts ADD COLUMN recurrence_days TEXT;

UPDATE scheduled_workouts
SET recurrence_days = '["' || recurrence_day || '"]'
WHERE recurrence_day IS NOT NULL;

ALTER TABLE scheduled_workouts DROP COLUMN recurrence_day;
