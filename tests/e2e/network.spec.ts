import { expect, test } from '@playwright/test';

/** KICKOFF §5: no request leaves the page except to api.usaspending.gov and api.nsf.gov on /funded. */
test('no request leaves this site except USAspending and NSF on /funded', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(`${new URL(page.url()).pathname} → ${u}`); });
  const cors = { 'access-control-allow-origin': '*' };
  await page.route('https://api.usaspending.gov/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"results":[]}' }));
  await page.route('https://api.nsf.gov/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"response":{"award":[]}}' }));
  for (const p of ['/', '/read', '/routes/nih-investigator-initiated-grant', '/programs/nih-r01', '/funders/simons-foundation', '/gates', '/find', '/find?tab=foundations', '/figures/changes-timeline', '/references', '/methods', '/glossary', '/changes']) {
    await page.goto(p);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(300);
  }
  await page.goto('/funded?aln=93.859');
  await page.getByTestId('usa-go').click();
  await page.getByTestId('nsf-kw').fill('x');
  await page.getByTestId('nsf-go').click();
  await page.waitForTimeout(500);
  const bad = outside.filter((u) => !/→ https:\/\/api\.(usaspending|nsf)\.gov\//.test(u) || !u.startsWith('/funded'));
  expect(bad).toEqual([]);
  expect(outside.length).toBeGreaterThan(1);
});
