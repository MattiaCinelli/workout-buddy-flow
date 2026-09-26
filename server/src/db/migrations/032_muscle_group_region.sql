-- The body region a muscle group belongs to (neck-back, chest-shoulders,
-- arms-hands, core-hips, legs-feet). Nullable: groups made before regions
-- existed have none until the app assigns one or the user places them.
ALTER TABLE muscle_groups ADD COLUMN region TEXT;
