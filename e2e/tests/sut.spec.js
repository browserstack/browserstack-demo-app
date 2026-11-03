const { test, expect } = require('@playwright/test');

async function sutLogin(page) {
  await page.goto('/sut/login');
  await expect(page.locator('#username-input')).toHaveValue('testuser');
  await expect(page.locator('#password-input')).toHaveValue('password');
  await page.locator('#login-submit-btn').click();
  await expect(page).toHaveURL(/\/sut\/dashboard$/);
}

test('/sut redirects to the SUT login', async ({ page }) => {
  await page.goto('/sut');
  await expect(page).toHaveURL(/\/sut\/login$/);
  await expect(page).toHaveTitle('SUT Login - Load Testing');
  await expect(page.getByRole('heading', { name: 'SDET Login' })).toBeVisible();
});

test('wrong credentials show an error', async ({ page }) => {
  await page.goto('/sut/login');
  await page.locator('#password-input').fill('wrong');
  await page.locator('#login-submit-btn').click();
  await expect(page.getByText('Login failed. Please check credentials.')).toBeVisible();
  await expect(page).toHaveURL(/\/sut\/login$/);
});

test('dashboard lists every control endpoint and UI page', async ({ page, context }) => {
  await sutLogin(page);
  await expect(page).toHaveTitle('SUT Dashboard - Metric Control');
  await expect(page.getByRole('heading', { name: 'Metric Control Dashboard' })).toBeVisible();
  const links = {
    'api-latency-avg': '/api/control/latency/avg',
    'api-latency-p99-outlier': '/api/control/latency/p99-outlier',
    'api-latency-threshold': '/api/control/latency/threshold',
    'api-error-success': '/api/control/error/success',
    'api-error-4xx': '/api/control/error/client-fail',
    'api-error-5xx': '/api/control/error/server-fail',
    'api-error-3xx': '/api/control/error/redirect-temp',
    'api-zero-errors': '/api/zero/errors',
    'ui-zero-cls': '/sut/ui/zero-cls',
    'ui-minimum-inp': '/sut/ui/minimum-inp',
    'ui-high-cls': '/sut/ui/high-cls',
    'ui-high-lcp': '/sut/ui/high-lcp',
  };
  for (const [id, href] of Object.entries(links)) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('href', href);
  }
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'sutSessionId')).toBeTruthy();
});

test('UI metric pages behave as designed', async ({ page }) => {
  await sutLogin(page);

  await page.locator('#ui-zero-cls').click();
  await expect(page.locator('#cls-zero-title')).toHaveText('Layout is Stable (CLS: 0.0)');
  await page.locator('#back-to-dashboard-btn').click();
  await expect(page).toHaveURL(/\/sut\/dashboard$/);

  await page.locator('#ui-minimum-inp').click();
  await page.locator('#inp-btn').click();
  await expect(page.locator('#output')).toHaveText('Interaction complete! (INP should be very low)');

  await page.goto('/sut/ui/high-cls');
  await expect(page.locator('#cls-high-title')).toBeVisible();
  await expect(page.locator('#shift-target')).toHaveText('--- UNEXPECTED BANNER LOADED ---', { timeout: 10000 });

  await page.goto('/sut/ui/high-lcp');
  await expect(page.locator('#lcp-high-title')).toBeVisible();
  await expect(page.getByText('Loading LCP Image...')).toBeVisible();
  await expect(page.locator('img[alt="Delayed LCP Image"]')).toHaveAttribute('src', 'https://picsum.photos/1000/600', { timeout: 10000 });
});

test('logout clears the session cookie', async ({ page, context }) => {
  await sutLogin(page);
  await page.locator('#logout-btn').click();
  await expect(page).toHaveURL(/\/sut\/login$/);
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'sutSessionId')).toBeFalsy();
});

for (const path of ['/sut/dashboard', '/sut/ui/zero-cls', '/sut/ui/high-cls', '/sut/ui/high-lcp', '/sut/ui/minimum-inp']) {
  test(`${path} without a session redirects to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sut\/login$/);
  });
}
