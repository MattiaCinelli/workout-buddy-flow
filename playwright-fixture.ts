import { test as base, expect } from '@playwright/test';

// Suppress the one-time first-run intro so it never sits on top of the UI
// under test. It's real first-launch behaviour, exercised separately if
// needed — every other spec should start past it.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('workout-buddy-onboarded', '1');
      } catch {
        /* storage disabled in this context */
      }
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture API, not a React hook
    await use(page);
  },
});

export { expect };
