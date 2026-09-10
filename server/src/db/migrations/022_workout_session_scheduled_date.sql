-- A recurring schedule id identifies the series, not one occurrence. Keep
-- the concrete planned date so completion status remains unambiguous.
ALTER TABLE workout_sessions ADD COLUMN scheduled_date TEXT;
