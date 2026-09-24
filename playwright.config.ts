import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The dev server compiles each route on first visit, and CI runners are slow
  // and share their CPU between workers, so a page (and the navbar on it) can
  // take well over the default 5 s to appear. Keep the strict default locally.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  // Keep visual baselines portable across developer machines and CI.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
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
