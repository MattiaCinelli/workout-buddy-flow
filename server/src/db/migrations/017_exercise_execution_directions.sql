-- Configurable directional defaults supersede the original unilateral flag.
-- JSON keeps their user-defined order. Existing rows and workouts remain
-- untouched and continue to use unilateral as a left/right fallback.
ALTER TABLE exercises ADD COLUMN execution_directions TEXT;
