-- Calendar occurrences created from a course retain the exact course slot,
-- including when multiple workouts share the same date.
ALTER TABLE scheduled_workouts ADD COLUMN course_id TEXT;
ALTER TABLE scheduled_workouts ADD COLUMN course_item_id TEXT;
