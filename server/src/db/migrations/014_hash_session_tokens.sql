-- Session tokens are now stored as their SHA-256 hash, not in the clear, so
-- a read of this table (a leaked backup, file access) can't hand out live
-- sessions. Existing rows hold raw tokens and can't be matched against a
-- hashed lookup, so clear them — every device simply logs in again.
DELETE FROM sessions;
