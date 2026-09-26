-- Preserve whether an exercise is tagged as a warm-up. Without this column
-- the tag was dropped on every sync. Existing exercises default to untagged;
-- adding the column in place keeps every existing row intact.
ALTER TABLE exercises ADD COLUMN warmup INTEGER NOT NULL DEFAULT 0 CHECK (warmup IN (0, 1));
