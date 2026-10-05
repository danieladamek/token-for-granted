import { expect, test } from '@playwright/test';

test('a route page lists only open, forecast, closed or formula programmes and shows the "N more" line', async ({ page }) => {
  await page.goto('/routes/research-instrumentation-and-facilities');
  const cards = page.getByTestId('route-programme');
  await expect(cards.first()).toBeVisible();
  const statuses = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-status')));
  expect(statuses.every((s) => ['open', 'forecast', 'closed', 'formula'].includes(String(s)))).toBe(true);
  await expect(page.getByTestId('route-more')).toHaveText(/^\d+ more programmes on this route have no current notice, have expired, are not being competed or could not be confirmed$/);
  await expect(page.getByTestId('route-statuses-note')).toContainText('Ruled by Daniel on 2026-10-05');
  await expect(page.getByTestId('find-block')).toBeVisible();
});

test('a programme page shows its status and the date it was read together', async ({ page }) => {
  await page.goto('/programs/nih-r01');
  const b = page.getByTestId('status-banner');
  await expect(b.getByTestId('status-label')).toHaveText('open');
  await expect(b.getByTestId('status-date')).toHaveText('read 2026-10-05');
  await expect(page.getByTestId('conflicts')).toContainText('Where sources differ');
  await expect(page.getByTestId('harvest-block')).toContainText('An Assistance Listing can cover several programmes');
});

test('a status: unconfirmed programme shows its banner in the glossary’s words', async ({ page }) => {
  await page.goto('/programs/doe-arpa-e-program-notices');
  const b = page.getByTestId('status-banner');
  await expect(b).toHaveAttribute('data-status', 'unconfirmed');
  await expect(b.getByTestId('status-words')).toContainText('the pages would not load or do not settle the question');
});

test('a foundation page shows its unsolicited note in full and the ProPublica link', async ({ page }) => {
  await page.goto('/funders/simons-foundation');
  await expect(page.getByTestId('unsolicited-note')).toContainText('will not consider unsolicited requests');
  await expect(page.getByTestId('propublica-link')).toHaveAttribute('href', 'https://projects.propublica.org/nonprofits/organizations/133794889');
});

test('a federal funder page labels a budget request as a request', async ({ page }) => {
  await page.goto('/funders/nih');
  await expect(page.getByTestId('budget')).toBeVisible();
  await expect(page.getByTestId('budget-request').first()).toContainText('a request');
});
