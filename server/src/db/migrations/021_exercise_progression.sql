-- Optional progression policy is kept as JSON so the server can round-trip
-- the client-owned policy without duplicating its small nested structure in
-- several nullable columns.
ALTER TABLE exercises ADD COLUMN progression TEXT;
