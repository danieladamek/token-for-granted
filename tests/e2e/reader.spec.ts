import { expect, test } from '@playwright/test';

test('a term popover opens by keyboard and closes with Esc, returning focus', async ({ page }) => {
  await page.goto('/read');
  const term = page.locator('article button.bx-term').first();
  await term.focus();
  await page.keyboard.press('Enter');
  const pop = page.locator('[data-testid$="-popover"]').first();
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Full entry');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(term).toBeFocused();
});

test('a citation fold-out shows a key fact with its check code in words', async ({ page }) => {
  await page.goto('/read');
  await page.getByTestId('cite-1851').first().click();
  const fo = page.getByTestId('citation-foldout').first();
  await expect(fo).toBeVisible();
  const fact = fo.getByTestId('key-fact').first();
  await expect(fact).toBeVisible();
  await expect(fact).toContainText(/C · confirmed on the live page|S · stated in part|N · not found on the second reading|X · the page says otherwise|- · not re-read/);
  await expect(fo.getByTestId('recheck')).toContainText(/Re-read 2026-10-05|Not re-read/);
});

test('a synthesis sentence is marked in the reader and linked from /methods', async ({ page }) => {
  await page.goto('/methods');
  const link = page.getByTestId('synthesis-list').locator('a').first();
  const href = await link.getAttribute('href');
  await link.click();
  const id = href!.split('#')[1];
  const s = page.locator(`#${id}`);
  await expect(s).toBeVisible();
  await expect(s).toHaveAttribute('data-testid', 'synthesis');
  await expect(s).toContainText('synthesis');
  await expect(page.getByTestId('review-banner')).toContainText('passages marked synthesis');
});

test('dark mode toggles and persists across a reload', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByTestId('theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
});

for (const route of ['/', '/read', '/find', '/figures/stipend-levels']) {
  test(`375 px: ${route} lays out without horizontal page scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(500);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}
