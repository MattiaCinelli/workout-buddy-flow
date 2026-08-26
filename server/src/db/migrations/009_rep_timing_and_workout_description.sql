-- Two independent additions:
-- 1. seconds_per_rep on exercises: paces a synthesized countdown for
--    reps-based sets (see src/lib/workoutRuntime.ts), so "do 10 reps" has
--    something to follow along with during a workout, same as a timed hold.
-- 2. description on workouts: what the workout is / who it's for, shown in
--    the workout list — distinct from `notes`, which is personal
--    per-session commentary (mood, goals).
ALTER TABLE exercises ADD COLUMN seconds_per_rep INTEGER;
ALTER TABLE workouts ADD COLUMN description TEXT;
