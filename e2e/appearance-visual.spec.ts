import { test, expect } from '../playwright-fixture';

const appearances = [
  { style: 'classic', mode: 'light' },
  { style: 'classic', mode: 'dark' },
  { style: 'starship', mode: 'light' },
  { style: 'starship', mode: 'dark' },
] as const;

for (const appearance of appearances) {
  test(`${appearance.style} ${appearance.mode} appearance`, async ({ page }) => {
    await page.addInitScript(({ style, mode }) => {
      localStorage.setItem('interface-style', style);
      localStorage.setItem('theme', mode);
    }, appearance);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page).toHaveScreenshot(`${appearance.style}-${appearance.mode}.png`, {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
