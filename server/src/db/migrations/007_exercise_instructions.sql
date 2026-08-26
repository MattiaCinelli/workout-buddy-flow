-- Free-text guidance shown to the user browsing the library and during a
-- workout ("how to perform this exercise") — nullable, purely descriptive,
-- no other column depends on it.
ALTER TABLE exercises ADD COLUMN instructions TEXT;
