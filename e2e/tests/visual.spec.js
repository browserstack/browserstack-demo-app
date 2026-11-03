// Pixel comparison against screenshots captured from a reference build.
// Capture the reference with `npm run test:visual:baseline` against the known-good
// build, then run `npm run test:visual` against the candidate build.
const { test, expect } = require('@playwright/test');
const { signIn, fillSignIn, waitForShelf, addToCart, closeCart, toggleVendor } = require('./helpers');

const shot = { fullPage: true, animations: 'disabled', maxDiffPixels: 0 };
// The fixed, transitioned cart panel shows run-to-run sub-pixel anti-aliasing noise
// (~100-400px) even on an unchanged build; allow that and nothing more.
const cartShot = { ...shot, fullPage: false, maxDiffPixels: 600 };

async function settle(page) {
  await page.mouse.move(1, 790);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))
  );
}

test('home', async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
  await settle(page);
  await expect(page).toHaveScreenshot('home.png', shot);
});

test('home filtered and sorted', async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
  await toggleVendor(page, 'Samsung');
  await waitForShelf(page, 7);
  await page.locator('.sort select').selectOption('highestprice');
  await expect(page.locator('.shelf-container .shelf-item__title').first()).toHaveText('Galaxy S20 Ultra');
  await settle(page);
  await expect(page).toHaveScreenshot('home-filtered.png', shot);
});

test('cart open', async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
  await addToCart(page, 1);
  await closeCart(page);
  await addToCart(page, 17);
  await page.waitForTimeout(600);
  await settle(page);
  await expect(page).toHaveScreenshot('cart-open.png', cartShot);
});

test('cart empty', async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
  await page.locator('.bag--float-cart-closed').click();
  await page.waitForTimeout(600);
  await settle(page);
  await expect(page).toHaveScreenshot('cart-empty.png', cartShot);
});

test('signin', async ({ page }) => {
  await page.goto('/signin');
  await settle(page);
  await expect(page).toHaveScreenshot('signin.png', shot);
});

test('signin menu open', async ({ page }) => {
  await page.goto('/signin');
  await page.locator('#username').click();
  await settle(page);
  await expect(page).toHaveScreenshot('signin-menu.png', shot);
});

test('signin error', async ({ page }) => {
  await page.goto('/signin');
  await fillSignIn(page, 'locked_user');
  await expect(page.locator('.api-error')).toBeVisible();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await settle(page);
  await expect(page).toHaveScreenshot('signin-error.png', shot);
});

test('signed in home with favourites', async ({ page }) => {
  await signIn(page, 'fav_user');
  await waitForShelf(page);
  await settle(page);
  await expect(page).toHaveScreenshot('home-fav-user.png', shot);
});

test('image_not_loading_user home', async ({ page }) => {
  await signIn(page, 'image_not_loading_user');
  await waitForShelf(page);
  await settle(page);
  await expect(page).toHaveScreenshot('home-image-not-loading.png', shot);
});

test('favourites', async ({ page }) => {
  await signIn(page, 'fav_user');
  await page.locator('#favourites').click();
  await waitForShelf(page, 5);
  await settle(page);
  await expect(page).toHaveScreenshot('favourites.png', shot);
});

test('checkout and confirmation', async ({ page }) => {
  await signIn(page, 'demouser');
  await waitForShelf(page);
  await addToCart(page, 1);
  await closeCart(page);
  await addToCart(page, 12);
  await page.locator('.buy-btn').click();
  await expect(page).toHaveURL(/\/checkout$/);
  await settle(page);
  await expect(page).toHaveScreenshot('checkout.png', shot);

  await page.locator('#firstNameInput').fill('Jane');
  await page.locator('#lastNameInput').fill('Doe');
  await page.locator('#addressLine1Input').fill('1 Test Street');
  await page.locator('#provinceInput').fill('MH');
  await page.locator('#postCodeInput').fill('400001');
  await page.locator('#checkout-shipping-continue').click();
  await expect(page.locator('#confirmation-message')).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot('confirmation.png', {
    ...shot,
    mask: [page.locator('.checkout-form strong')],
  });
});

test('orders', async ({ page }) => {
  await signIn(page, 'existing_orders_user');
  await page.locator('#orders').click();
  await expect(page.locator('.order')).toHaveCount(5);
  await settle(page);
  await expect(page).toHaveScreenshot('orders.png', shot);
});

test('orders empty', async ({ page }) => {
  await signIn(page, 'demouser');
  await page.locator('#orders').click();
  await expect(page.getByText('No orders found')).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot('orders-empty.png', shot);
});

test('offers', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.5, longitude: -0.12 });
  await signIn(page, 'demouser');
  await page.locator('#offers').click();
  await expect(page.locator('.offer')).toHaveCount(3);
  await settle(page);
  await expect(page).toHaveScreenshot('offers.png', shot);
});

test('offers unavailable', async ({ page }) => {
  await signIn(page, 'demouser');
  await page.locator('#offers').click();
  await expect(page.getByText('Please enable Geolocation in your browser.')).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot('offers-denied.png', shot);
});

test('swagger', async ({ page }) => {
  await page.goto('/swagger');
  await expect(page.locator('.opblock')).toHaveCount(13);
  await settle(page);
  await expect(page).toHaveScreenshot('swagger.png', shot);
});

test('swagger operation expanded', async ({ page }) => {
  await page.goto('/swagger');
  await page.locator('.opblock-summary-path[data-path="/api/signin"]').click();
  await expect(page.locator('.opblock.is-open')).toHaveCount(1);
  await settle(page);
  await expect(page).toHaveScreenshot('swagger-open.png', shot);
});

test('sut login and dashboard', async ({ page }) => {
  await page.goto('/sut/login');
  await settle(page);
  await expect(page).toHaveScreenshot('sut-login.png', shot);
  await page.locator('#login-submit-btn').click();
  await expect(page).toHaveURL(/\/sut\/dashboard$/);
  await settle(page);
  await expect(page).toHaveScreenshot('sut-dashboard.png', shot);
  await page.locator('#ui-zero-cls').click();
  await expect(page.locator('#cls-zero-title')).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot('sut-zero-cls.png', shot);
  await page.goto('/sut/ui/minimum-inp');
  await page.locator('#inp-btn').click();
  await settle(page);
  await expect(page).toHaveScreenshot('sut-minimum-inp.png', shot);
});

test('404', async ({ page }) => {
  await page.goto('/nope');
  await settle(page);
  await expect(page).toHaveScreenshot('404.png', shot);
});
