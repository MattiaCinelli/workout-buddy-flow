-- Rest between sets of the SAME exercise is now a distinct setting from
-- rest_between_exercises (added in 002) — a short breather within an
-- exercise reads very differently than the longer transition needed to
-- get set up for a different one.
ALTER TABLE workouts ADD COLUMN rest_between_sets INTEGER;
