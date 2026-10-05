import { expect, test } from '@playwright/test';

const cors = { 'access-control-allow-origin': '*' };

test('/funded with USAspending mocked shows recipients; with the mock failing, a plain message and the manual link', async ({ page }) => {
  await page.route('https://api.usaspending.gov/api/v2/search/spending_by_category/recipient/', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: [{ name: 'A UNIVERSITY', amount: 1234567, recipient_id: 'abc-C', uei: 'X' }] }) }));
  await page.route('https://api.usaspending.gov/api/v2/search/spending_by_award_count/', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: { grants: 7, direct_payments: 0, other: 0 } }) }));
  await page.goto('/funded?aln=93.859&label=NIH%20R01');
  await expect(page.getByTestId('funded-notice')).toContainText('api.usaspending.gov');
  await page.getByTestId('usa-go').click();
  await expect(page.getByTestId('usa-recipient')).toHaveCount(1);
  await expect(page.getByTestId('usa-results')).toContainText('7 awards');
  await expect(page.getByTestId('usa-recipient').locator('a')).toHaveAttribute('href', 'https://www.usaspending.gov/recipient/abc-C/latest');

  await page.unroute('https://api.usaspending.gov/api/v2/search/spending_by_category/recipient/');
  await page.route('https://api.usaspending.gov/**', (r) => r.fulfill({ status: 500, headers: cors, body: 'down' }));
  await page.evaluate(() => sessionStorage.clear());
  await page.getByTestId('usa-type').selectOption('nonprofit');
  await page.getByTestId('usa-go').click();
  await expect(page.getByTestId('usa-error')).toContainText('USAspending did not answer (500)');
  await expect(page.getByTestId('usa-error').locator('a')).toHaveAttribute('href', 'https://www.usaspending.gov/search');
});

test('/funded: NSF awards mocked; NIH is a link to RePORTER with the code in it', async ({ page }) => {
  await page.route('https://api.nsf.gov/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ response: { award: [{ id: '2400001', title: 'An award', awardeeName: 'A College', fundsObligatedAmt: '100000', startDate: '01/01/2026', expDate: '12/31/2027' }] } }) }));
  await page.goto('/funded?code=R15');
  await page.getByTestId('nsf-kw').fill('EPSCoR');
  await page.getByTestId('nsf-go').click();
  await expect(page.getByTestId('nsf-results').locator('a')).toHaveAttribute('href', 'https://www.nsf.gov/awardsearch/showAward?AWD_ID=2400001');
  await expect(page.getByTestId('nih-link')).toHaveAttribute('href', 'https://reporter.nih.gov/advanced-search');
  await expect(page.getByTestId('nih-code')).toContainText('R15');
});
