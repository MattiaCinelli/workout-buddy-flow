-- For 'holds' exercises (timed repetitions, e.g. 5 × 10 s): the pause
-- between two holds of one set. Nullable: other exercises have none, and
-- a holds exercise without one uses the app's 5-second default.
ALTER TABLE exercises ADD COLUMN seconds_between_holds INTEGER;
