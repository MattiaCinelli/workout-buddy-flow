import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../playwright-fixture';

const appearances = [
  { style: 'classic', mode: 'light', themeColor: '#f7f8fa' },
  { style: 'classic', mode: 'dark', themeColor: '#080b16' },
  { style: 'starship', mode: 'light', themeColor: '#f7f0e3' },
  { style: 'starship', mode: 'dark', themeColor: '#08080f' },
] as const;

for (const appearance of appearances) {
  test(`${appearance.style} ${appearance.mode} passes the accessibility audit`, async ({ page }) => {
    await page.addInitScript(({ style, mode }) => {
      localStorage.setItem('interface-style', style);
      localStorage.setItem('theme', mode);
    }, appearance);
    await page.goto('/settings');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', appearance.themeColor);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, results.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
}

test('keyboard navigation exposes a visible focus indicator and labeled controls', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  await expect(focused).toHaveAccessibleName(/.+/);

  const focusStyle = await focused.evaluate(element => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
  });
  expect(
    (focusStyle.outline !== 'none' && focusStyle.width !== '0px') || focusStyle.shadow !== 'none',
    'Focused control should have a visible outline or focus ring',
  ).toBe(true);
});
