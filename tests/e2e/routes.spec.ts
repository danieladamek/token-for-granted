import { expect, test } from '@playwright/test';

/** KICKOFF §5: every route answers and renders its h1 and the footer disclaimer. */
const PATHS = [
  '/', '/routes', '/routes/getting-registered-to-apply', '/routes/nih-investigator-initiated-grant', '/routes/predoctoral-fellowship',
  '/routes/health-and-behavioural-health-services', '/routes/research-instrumentation-and-facilities', '/programs',
  '/programs/nih-r01', '/programs/cdc-niosh-r01', '/programs/nih-dp1-pioneer', '/programs/hrsa-miechv', '/programs/epa-star',
  '/programs/ed-fulbright-hays-ddra', '/programs/noaa-oar-baa', '/programs/doe-arpa-e-program-notices',
  '/funders', '/funders/nih', '/funders/simons-foundation', '/standing', '/gates', '/how', '/help', '/changes', '/find', '/funded',
  '/read', '/glossary', '/concepts', '/concepts/indirect-costs-101', '/figures', '/figures/four-doors', '/figures/indirect-cost-rules', '/figures/stipend-levels',
  '/figures/foundation-doors', '/figures/changes-timeline', '/references', '/methods', '/about', '/notes',
];

for (const p of PATHS) {
  test(`${p} renders its h1 and the footer disclaimer`, async ({ page }) => {
    const res = await page.goto(p);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByTestId('footer-disclaimer')).toContainText('Not legal, tax, financial or compliance advice');
  });
}

test('an unknown path shows the not-found page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('main h1')).toHaveText('Page not found');
});

test('the navigation says "Primers", and a primer page has no quiz', async ({ page }) => {
  await page.goto('/concepts/indirect-costs-101');
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Primers' })).toBeVisible();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText(/self-check/i)).toHaveCount(0);
  await expect(page.locator('main input[type=radio]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The maths, gently' })).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
});

test('as_of appears on /, /read and /about', async ({ page }) => {
  for (const [p, id] of [['/', 'home-asof'], ['/read', 'read-asof'], ['/about', 'about-asof']]) {
    await page.goto(p);
    await expect(page.getByTestId(id)).toContainText('2026-10-05');
  }
});
