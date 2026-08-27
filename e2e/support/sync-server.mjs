// Boots a throwaway sync server for the Playwright suite: fresh SQLite file
// every run, one known test account, then hands off to the server process.
// Referenced from playwright.config.ts as a second `webServer`.
//
// Env it sets for the server: DATABASE_PATH (temp file), PORT 3999, HOST
// 127.0.0.1. The app under test connects to http://127.0.0.1:3999.
import { rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '../../server');
const dbPath = path.join(serverDir, 'data', 'e2e.sqlite');

export const E2E_SERVER_URL = 'http://127.0.0.1:3999';
export const E2E_EMAIL = 'e2e@test.local';
export const E2E_PASSWORD = 'e2e-password-123';

const env = { ...process.env, DATABASE_PATH: dbPath, PORT: '3999', HOST: '127.0.0.1' };

// Start from a clean database so "user already exists" / stale rows can't
// make a run flaky. -wal / -shm are SQLite's WAL sidecar files.
for (const suffix of ['', '-wal', '-shm']) {
  rmSync(dbPath + suffix, { force: true });
}

// create-user prompts for "Password:" then "Confirm password:"; with no TTY
// its prompter reads plain lines from stdin, so two newline-separated
// copies of the password satisfy it.
const createUser = spawnSync(
  'npm',
  ['run', '--silent', 'create-user', '--', E2E_EMAIL],
  { cwd: serverDir, env, input: `${E2E_PASSWORD}\n${E2E_PASSWORD}\n`, encoding: 'utf8' },
);
process.stdout.write(createUser.stdout ?? '');
process.stderr.write(createUser.stderr ?? '');
if (createUser.status !== 0) {
  process.exit(createUser.status ?? 1);
}

// Hand off to the server (run from source, no build step, no file watcher).
const server = spawn('npm', ['run', '--silent', 'serve'], { cwd: serverDir, env, stdio: 'inherit' });
server.on('exit', code => process.exit(code ?? 0));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.kill(signal));
}
