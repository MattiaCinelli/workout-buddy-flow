import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
    },
    {
      // Throwaway sync server for e2e/sync.spec.ts — fresh DB + one test
      // account each run. Always started fresh (never reuse a possibly
      // stale one). Specs that don't need it simply ignore it.
      command: 'node e2e/support/sync-server.mjs',
      url: 'http://127.0.0.1:3999/health',
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
