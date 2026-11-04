const { test, expect } = require('@playwright/test');
const { signIn, waitForShelf, addToCart } = require('./helpers');

// Full page loads with a signed-in session are where server-rendered HTML and the
// first client render can disagree; React reports that as an uncaught error.
test('no uncaught page errors across full page loads', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 19.07, longitude: 72.87 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  for (const path of ['/', '/signin', '/swagger', '/sut/login', '/nope']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  await signIn(page, 'existing_orders_user');
  await waitForShelf(page);
  await addToCart(page, 1);
  for (const path of ['/', '/signin', '/favourites', '/orders', '/offers', '/checkout']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  await page.goto('/checkout');
  for (const id of ['firstNameInput', 'lastNameInput', 'addressLine1Input', 'provinceInput', 'postCodeInput']) {
    await page.locator(`#${id}`).fill('x');
  }
  await page.locator('#checkout-shipping-continue').click();
  await expect(page).toHaveURL(/\/confirmation$/);
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.goto('/sut/login');
  await page.locator('#login-submit-btn').click();
  await expect(page).toHaveURL(/\/sut\/dashboard$/);
  for (const path of ['/sut/dashboard', '/sut/ui/zero-cls', '/sut/ui/minimum-inp', '/sut/ui/high-cls', '/sut/ui/high-lcp']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  expect(errors).toEqual([]);
});
