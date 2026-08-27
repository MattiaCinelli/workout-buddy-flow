-- Per-occurrence recovery state for recurring schedules. Stored as JSON,
-- matching recurrence_days, because SQLite does not need to query inside it.
ALTER TABLE scheduled_workouts ADD COLUMN skipped_dates TEXT;
