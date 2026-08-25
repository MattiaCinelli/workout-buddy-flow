import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export type Db = Database.Database;

const ensureMigrationsTable = (db: Db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
};

const appliedMigrations = (db: Db): Set<string> => {
  const rows = db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[];
  return new Set(rows.map(row => row.name));
};

// Applies any .sql file in migrations/ not yet recorded in
// schema_migrations, in filename order. Each migration runs in its own
// transaction, so a failing migration doesn't leave the schema half-applied.
export const runMigrations = (db: Db) => {
  ensureMigrationsTable(db);
  const applied = appliedMigrations(db);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(file, new Date().toISOString());
    });
    applyMigration();
  }
};

export const openDb = (filePath: string): Db => {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
};
