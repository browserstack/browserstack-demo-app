const { test, expect } = require('@playwright/test');
const { signIn, waitForShelf, product } = require('./helpers');

test.describe('favourites', () => {
  test('anonymous favourite click redirects to sign in', async ({ page }) => {
    await page.goto('/');
    await waitForShelf(page);
    await product(page, 1).locator('.shelf-stopper button').click();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test('fav_user has five favourites', async ({ page }) => {
    await signIn(page, 'fav_user');
    await waitForShelf(page);
    await expect(page.locator('.shelf-stopper button.clicked')).toHaveCount(5);
    await page.locator('#favourites').click();
    await expect(page).toHaveURL(/\/favourites$/);
    await waitForShelf(page, 5);
    await expect(page.locator('.shelf-container .shelf-item__title')).toHaveText([
      'iPhone 12',
      'iPhone 12 Mini',
      'iPhone 12 Pro Max',
      'iPhone 12 Pro',
      'iPhone 11',
    ]);
    await expect(page.locator('.filters')).toHaveCount(0);
    await expect(page.locator('.sort')).toHaveCount(0);
  });

  test('demouser can toggle a favourite and see it on the favourites page', async ({ page }) => {
    await signIn(page, 'demouser');
    await waitForShelf(page);
    await expect(page.locator('.shelf-stopper button.clicked')).toHaveCount(0);
    const fav = product(page, 12).locator('.shelf-stopper button');
    await fav.click();
    await expect(fav).toHaveClass(/clicked/);
    await product(page, 4).locator('.shelf-stopper button').click();
    await product(page, 4).locator('.shelf-stopper button').click();
    await expect(product(page, 4).locator('.shelf-stopper button')).not.toHaveClass(/clicked/);
    await page.locator('#favourites').click();
    await expect(page).toHaveURL(/\/favourites$/);
    await waitForShelf(page, 1);
    await expect(page.locator('.shelf-container .shelf-item__title')).toHaveText(['Galaxy S20 Ultra']);
  });

  test('favourite items can be added to cart from the favourites page', async ({ page }) => {
    await signIn(page, 'fav_user');
    await page.locator('#favourites').click();
    await waitForShelf(page, 5);
    await product(page, 5).locator('.shelf-item__buy-btn').click();
    await expect(page.locator('.float-cart__shelf-container .shelf-item .title')).toHaveText(['iPhone 11']);
  });
});

test.describe('offers', () => {
  test('shows offers when in a supported city', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 19.0760, longitude: 72.8777 });
    await signIn(page, 'demouser');
    await page.locator('#offers').click();
    await expect(page).toHaveURL(/\/offers$/);
    await expect(page.getByText("We've promotional offers in your location.")).toBeVisible();
    await expect(page.locator('.offer')).toHaveCount(3);
    await expect(page.locator('.offer-title')).toHaveText(['30% off on iPhones', '20% off on OnePlus', 'Free Shipping']);
    await expect(page.locator('.offer img')).toHaveCount(3);
    await expect
      .poll(() => page.locator('.offer img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)))
      .toBe(true);
  });

  test('shows a message when the city is unsupported', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.0, longitude: 10.0 });
    await signIn(page, 'demouser');
    await page.locator('#offers').click();
    await expect(page.getByText('Sorry we do not have any promotional offers in your city.')).toBeVisible();
  });

  test('asks to enable geolocation when permission is denied', async ({ page }) => {
    await signIn(page, 'demouser');
    await page.locator('#offers').click();
    await expect(page.getByText('Please enable Geolocation in your browser.')).toBeVisible();
  });
});

test('swagger UI renders the API documentation', async ({ page }) => {
  await page.goto('/swagger');
  await expect(page).toHaveTitle('BrowserStack Demo API');
  await expect(page.locator('.swagger-ui .title')).toContainText('BrowserStack Demo API');
  await expect(page.locator('.opblock')).toHaveCount(13);
  for (const path of ['/api/products', '/api/orders', '/api/offers', '/api/signin', '/api/checkout']) {
    await expect(page.locator(`.opblock-summary-path[data-path="${path}"]`)).toBeVisible();
  }
});
