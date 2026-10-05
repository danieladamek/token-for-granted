import { expect, test } from '@playwright/test';

test('a chart tooltip appears on hover', async ({ page }) => {
  await page.goto('/figures/foundation-doors');
  const chart = page.getByTestId('chart-foundation-doors');
  await expect(chart).toBeVisible();
  const bar = chart.locator('.recharts-bar-rectangle path, .recharts-rectangle').first();
  await bar.hover();
  await expect(page.getByTestId('chart-tooltip')).toBeVisible();
});

test('Figure 10: points offset with the note that the offset carries no meaning; a point opens its change record', async ({ page }) => {
  await page.goto('/figures/changes-timeline');
  await expect(page.getByTestId('offset-note')).toContainText('the offset carries no meaning');
  const pt = page.locator('[data-testid="chart-changes-timeline"] .recharts-symbols').first();
  await pt.click({ force: true });
  await expect(page).toHaveURL(/\/changes#ch-/);
});

test('a table figure links its records and offers the data file and the drawing script', async ({ page }) => {
  await page.goto('/figures/indirect-cost-rules');
  await expect(page.getByTestId('table-indirect-cost-rules')).toBeVisible();
  await expect(page.getByTestId('table-indirect-cost-rules').locator('a[href^="/how#"]').first()).toBeVisible();
  const dl = page.getByTestId('figure-downloads');
  await expect(dl.getByRole('link', { name: /Data \(indirect-cost-rules.csv\)/ })).toBeVisible();
  await expect(dl.getByRole('link', { name: /Script \(indirect-cost-rules.py\)/ })).toBeVisible();
});

test('Figure 8 is a filled grid as well as a table; the pathway nodes open their references', async ({ page }) => {
  await page.goto('/figures/jurisdiction-lists');
  await expect(page.getByTestId('jurisdiction-grid')).toBeVisible();
  await page.goto('/figures/who-decides');
  await page.locator('[data-kind="decide"]').first().click();
  await expect(page.getByTestId('pathway-card')).toContainText('decide');
  await expect(page.locator('[data-kind="overlay"]')).toHaveCount(1);
});
