import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../playwright-fixture';

const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Primary navigation' });

test.describe('desktop navigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows six labelled items, with Calendar, History and Progress grouped under Track', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Dashboard', 'Workouts', 'Exercises', 'Courses', 'Track', 'Settings']) {
      const item = nav(page).getByRole('button', { name, exact: true });
      await expect(item).toBeVisible();
      await expect(item).toContainText(name); // the label is visible text, not just an icon
    }
    for (const name of ['Calendar', 'History', 'Progress']) {
      await expect(nav(page).getByRole('button', { name, exact: true })).toHaveCount(0);
    }

    await nav(page).getByRole('button', { name: 'Track' }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Calendar', 'History', 'Progress']);
  });

  test('Track opens a menu that navigates, and shows as current on any of its pages', async ({ page }) => {
    await page.goto('/workouts');
    const track = nav(page).getByRole('button', { name: 'Track' });
    await expect(track).not.toHaveAttribute('data-active', 'true');

    for (const [name, path] of [['History', '/history'], ['Progress', '/progress'], ['Calendar', '/calendar']] as const) {
      await track.click();
      await page.getByRole('menuitem', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(track).toHaveAttribute('data-active', 'true');
      await expect(page.getByRole('menu')).toBeHidden();
    }

    // Leaving the group clears the highlight, and the open menu marks the current page.
    await nav(page).getByRole('button', { name: 'Workouts', exact: true }).click();
    await expect(track).not.toHaveAttribute('data-active', 'true');
    await page.goto('/history');
    await track.click();
    await expect(page.getByRole('menuitem', { name: 'History' })).toHaveAttribute('aria-current', 'page');
  });

  test('Track works from the keyboard', async ({ page }) => {
    await page.goto('/workouts');
    await nav(page).getByRole('button', { name: 'Track' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    // Arrow keys move through the items; stop on History, whichever item focus starts on.
    const history = page.getByRole('menuitem', { name: 'History' });
    for (let step = 0; step < 4 && !(await history.evaluate(el => el === document.activeElement)); step++) {
      await page.keyboard.press('ArrowDown');
    }
    await expect(history).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/history$/);

    await nav(page).getByRole('button', { name: 'Track' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page).toHaveURL(/\/history$/);
  });

  // The open trigger is styled per theme (text colour and fill both change),
  // so audit every appearance rather than only the default one.
  for (const [style, mode] of [['classic', 'light'], ['classic', 'dark'], ['starship', 'light'], ['starship', 'dark']] as const) {
    test(`the open menu and the bar pass the accessibility audit (${style} ${mode})`, async ({ page }) => {
      await page.addInitScript(({ style, mode }) => {
        localStorage.setItem('interface-style', style);
        localStorage.setItem('theme', mode);
      }, { style, mode });
      await page.goto('/workouts');
      await nav(page).getByRole('button', { name: 'Track' }).click();
      await expect(page.getByRole('menu')).toBeVisible();
      await page.mouse.move(640, 400); // off the trigger, so it shows its "open" rather than "hover" look
      const audit = await new AxeBuilder({ page })
        .include('nav[aria-label="Primary navigation"]').include('[role="menu"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(audit.violations, audit.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
    });
  }
});

test.describe('narrower screens', () => {
  test('labels stay visible on a small laptop and collapse to named icons on a tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await expect(nav(page).getByText('Workouts', { exact: true })).toBeVisible();
    await expect(nav(page).getByText('Track', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 800, height: 768 });
    await expect(nav(page).getByText('Workouts', { exact: true })).toBeHidden();
    // Icon-only, but every control still has a name.
    for (const name of ['Dashboard', 'Workouts', 'Exercises', 'Courses', 'Track', 'Settings']) {
      await expect(nav(page).getByRole('button', { name, exact: true })).toBeVisible();
    }
    // The six items and the account controls fit without overflowing the page.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('the phone drawer groups pages under Train and Track headings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/history');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.getByRole('dialog');

    const train = drawer.getByRole('group', { name: 'Train' });
    const track = drawer.getByRole('group', { name: 'Track' });
    await expect(train.getByRole('button')).toHaveText(['Workouts', 'Exercises', 'Courses']);
    await expect(track.getByRole('button')).toHaveText(['Calendar', 'History', 'Progress']);
    await expect(drawer.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(track.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');

    const audit = await new AxeBuilder({ page }).include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations, audit.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);

    await track.getByRole('button', { name: 'Progress' }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(drawer).toBeHidden();
  });
});
