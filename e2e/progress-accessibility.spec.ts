import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../playwright-fixture';

// The Progress page was not covered by any accessibility audit, and its
// "Clear history" button shipped with red text below the WCAG AA contrast
// minimum. Audit the whole page in both colour schemes.
for (const mode of ['light', 'dark'] as const) {
  test(`progress page passes the accessibility audit in ${mode} mode`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('theme', theme), mode);
    await page.goto('/progress');
    await expect(page.getByRole('button', { name: 'Clear history' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, results.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
}
