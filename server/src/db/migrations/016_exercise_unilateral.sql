-- Preserve whether an exercise is performed one limb at a time. Existing
-- exercises default to bilateral; adding the column in place keeps every
-- existing exercise and workout row intact.
ALTER TABLE exercises ADD COLUMN unilateral INTEGER NOT NULL DEFAULT 0 CHECK (unilateral IN (0, 1));
