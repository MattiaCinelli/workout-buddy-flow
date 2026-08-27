-- Marks a workout as protected from accidental deletion (see
-- checkWorkoutDeletion on the client) — stored here too so the protection
-- follows the workout across every synced device, not just the one it was
-- favorited on.
ALTER TABLE workouts ADD COLUMN favorite INTEGER;
