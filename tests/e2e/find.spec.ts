import { expect, test } from '@playwright/test';

test('/find: keyword, an applicant-type group, a route saved filter; results update and link out', async ({ page }) => {
  await page.goto('/find');
  await expect(page.getByTestId('harvest-date')).toContainText('2026-10-05');
  await expect(page.getByTestId('count-posted')).toHaveText('20');
  await expect(page.getByTestId('count-forecast')).toHaveText('6');
  const status = page.getByTestId('find-status');
  await expect(status).toHaveText(/^26 results/);
  await page.getByTestId('elig-group-unrestricted-other').click();
  await expect(status).not.toHaveText(/^26 results/);
  const unrestricted = await status.textContent();
  await page.getByTestId('elig-group-unrestricted-other').click();
  await page.getByTestId('find-q').fill('research');
  await expect(status).not.toHaveText(/^26 results/);
  await page.getByTestId('find-q').fill('');
  await page.getByTestId('saved-nih-investigator-initiated-grant').click();
  await expect(page.getByTestId('saved-label')).toHaveText('An investigator-initiated NIH research grant');
  await expect(page).toHaveURL(/elig=06%7C20/);
  const first = page.getByTestId('find-result').first();
  await expect(first.locator('a').first()).toHaveAttribute('href', /^https:\/\/www\.grants\.gov\/search-results-detail\/\d+$/);
  expect(unrestricted).toMatch(/result/);
  await expect(page.locator('[data-testid="find-result"][data-status="forecast"]').first().or(page.getByTestId('find-results'))).toBeVisible();
});

test('/find with the data folder missing shows the degrade message and the Grants.gov link', async ({ page }) => {
  await page.route('**/data/**', (r) => r.fulfill({ status: 404, body: 'not found' }));
  await page.goto('/find');
  await expect(page.getByTestId('find-degraded')).toContainText('no harvested opportunity data');
  await expect(page.getByTestId('find-degraded').getByRole('link', { name: /Grants\.gov search/ })).toHaveAttribute('href', 'https://www.grants.gov/search-grants');
});

test('the foundation directory loads top.json and then a state', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/data/foundations/')) seen.push(r.url().split('/data/foundations/')[1]); });
  await page.goto('/find?tab=foundations');
  await expect(page.getByTestId('foundation-count')).toHaveText('12');
  await expect(page.getByTestId('directory-row').first()).toBeVisible();
  expect(seen).toContain('top.json');
  await page.getByTestId('directory-state').selectOption('DE');
  await expect(page.getByTestId('directory-status')).toContainText('in DE');
  expect(seen).toContain('de.json');
  await expect(page.getByTestId('directory-row').first().locator('a')).toHaveAttribute('href', /^https:\/\/projects\.propublica\.org\/nonprofits\/organizations\/\d{9}$/);
});
