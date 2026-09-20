import { test, expect } from '../playwright-fixture';

const appearances = [
  { style: 'classic', mode: 'light' },
  { style: 'classic', mode: 'dark' },
  { style: 'starship', mode: 'light' },
  { style: 'starship', mode: 'dark' },
] as const;

// The committed baselines are produced on macOS. Chromium on Linux uses a
// different text rasterizer and, for this full Settings page, can land one
// pixel taller even with the same bundled fonts. Keep the stricter threshold
// where the baselines originate while allowing only the measured rendering
// variance in Linux CI; structural layout changes still exceed 3.5%.
const maxDiffPixelRatio = process.platform === 'linux' ? 0.035 : 0.01;
const snapshotHeight = (style: typeof appearances[number]['style']) => style === 'classic' ? 2905 : 2937;

for (const appearance of appearances) {
  test(`${appearance.style} ${appearance.mode} appearance`, async ({ page }) => {
    await page.addInitScript(({ style, mode }) => {
      localStorage.setItem('interface-style', style);
      localStorage.setItem('theme', mode);
    }, appearance);
    await page.setViewportSize({ width: 1280, height: snapshotHeight(appearance.style) });
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page).toHaveScreenshot(`${appearance.style}-${appearance.mode}.png`, {
      animations: 'disabled',
      // Capture the explicitly baseline-sized viewport. Using fullPage here
      // makes Playwright replace this height with Linux's one-pixel-taller
      // document height, causing a dimension mismatch before pixel tolerance
      // can be applied.
      fullPage: false,
      maxDiffPixelRatio,
    });
  });
}
