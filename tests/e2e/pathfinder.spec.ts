import { expect, test } from '@playwright/test';

test('a non-profit delivering a service is led to programme-service routes, each with its count; clearing empties localStorage', async ({ page }) => {
  await page.goto('/');
  await page.getByText('A non-profit that runs programmes or services').click();
  await page.getByText('Delivering a programme or a service').click();
  const results = page.getByTestId('pf-results');
  await expect(results).toBeVisible();
  const first = results.locator('li').first();
  await expect(first).toHaveAttribute('data-family', 'programme-service');
  await expect(first.getByTestId('pf-count')).toHaveText(/^\d+ of \d+ programmes on this route fit both answers\.$/);
  await expect(page.getByTestId('pf-last')).toHaveText('No route is recommended over another.');
  expect(await results.innerText()).not.toMatch(/\b(best|top|recommended)\b/i);
  expect(await page.evaluate(() => localStorage.getItem('token-for-granted:pathfinder-answers'))).toContain('nonprofit-programmes');
  await page.reload();
  await expect(page.getByTestId('pf-results')).toBeVisible();
  await page.getByTestId('clear-answers').click();
  expect(await page.evaluate(() => localStorage.getItem('token-for-granted:pathfinder-answers'))).toBeNull();
  await expect(page.getByTestId('pf-results')).toHaveCount(0);
});

test('with no answers the family cards show and the strip lists five changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('family-card-research')).toBeVisible();
  await expect(page.getByTestId('changes-strip').locator('li')).toHaveCount(5);
});
