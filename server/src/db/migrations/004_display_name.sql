-- A display name, separate from the login email — the account button and
-- dialog show this instead of the email when set, closer to a normal app
-- profile. Nullable: falls back to showing the email when absent.
ALTER TABLE users ADD COLUMN display_name TEXT;
