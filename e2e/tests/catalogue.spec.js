const { test, expect } = require('@playwright/test');
const {
  TOTAL_PRODUCTS,
  VENDOR_COUNTS,
  waitForShelf,
  product,
  toggleVendor,
  shelfPrices,
  signIn,
} = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
});

test.describe('home page layout', () => {
  test('renders title, header, banner and footer', async ({ page }) => {
    await expect(page).toHaveTitle('StackDemo');
    await expect(page.locator('img[alt="logo"]')).toBeVisible();
    await expect(page.locator('img[alt="banner main"]')).toBeVisible();
    await expect(page.locator('#offers')).toHaveText('Offers');
    await expect(page.locator('#orders')).toHaveText('Orders');
    await expect(page.locator('#favourites')).toHaveText('Favourites');
    await expect(page.locator('#signin')).toHaveText('Sign In');
    await expect(page.getByPlaceholder('Search')).toBeVisible();
    await expect(page.locator('.filters .title')).toHaveText('Vendors:');
    await expect(page.locator('.sort select option')).toHaveText(['Select', 'Lowest to highest', 'Highest to lowest']);
    await expect(page.locator('#custom-footer')).toContainText('© 2026 BrowserStack Demo');
    await expect(page.locator('.footer-links a')).toHaveText(['Offers', 'Contact Us', 'Privacy Policy', 'Careers']);
    await expect(page.getByText('Exclusive offers coming soon')).toBeVisible();
  });

  test('all images on the page load', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const broken = await page.locator('img').evaluateAll((imgs) =>
      imgs.filter((img) => img.getAttribute('src') && !(img.complete && img.naturalWidth > 0)).map((img) => img.src)
    );
    expect(broken).toEqual([]);
  });

  test('renders product cards with price and installments', async ({ page }) => {
    const card = product(page, 1);
    await expect(card).toHaveAttribute('data-sku', 'iPhone12-device-info.png');
    await expect(card.locator('.shelf-item__title')).toHaveText('iPhone 12');
    await expect(card.locator('.val')).toHaveText('$799.00');
    await expect(card.locator('.installment')).toHaveText('or 9 x $ 88.78');
    await expect(card.locator('.shelf-item__buy-btn')).toHaveText('Add to cart');
    await expect(card.locator('.shelf-item__thumb img')).toHaveAttribute('alt', 'img');
    await expect(page.locator('.shelf-container .shelf-item__title')).toHaveCount(TOTAL_PRODUCTS);
  });

  test('search button reloads the page', async ({ page }) => {
    await page.getByPlaceholder('Search').fill('iphone');
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Search' }).click()]);
    await expect(page.getByPlaceholder('Search')).toHaveValue('');
    await waitForShelf(page);
  });
});

test.describe('vendor filter', () => {
  for (const [vendor, count] of Object.entries(VENDOR_COUNTS)) {
    test(`filters by ${vendor}`, async ({ page }) => {
      await toggleVendor(page, vendor);
      await waitForShelf(page, count);
      await toggleVendor(page, vendor);
      await waitForShelf(page);
    });
  }

  test('combines multiple vendors', async ({ page }) => {
    await toggleVendor(page, 'Apple');
    await waitForShelf(page, 9);
    await toggleVendor(page, 'Google');
    await waitForShelf(page, 12);
    await toggleVendor(page, 'Apple');
    await waitForShelf(page, 3);
    await expect(page.locator('.shelf-container .shelf-item__title')).toHaveText(['Pixel 4', 'Pixel 3', 'Pixel 2']);
  });
});

test.describe('sorting', () => {
  test('sorts lowest to highest', async ({ page }) => {
    await page.locator('.sort select').selectOption('lowestprice');
    await expect(page.locator('.shelf-container .shelf-item__title').first()).toHaveText('Pixel 2');
    const prices = await shelfPrices(page);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBe(399);
    expect(prices[prices.length - 1]).toBe(1399);
  });

  test('sorts highest to lowest', async ({ page }) => {
    await page.locator('.sort select').selectOption('highestprice');
    await expect(page.locator('.shelf-container .shelf-item__title').first()).toHaveText('Galaxy S20 Ultra');
    const prices = await shelfPrices(page);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('sorting composes with filters', async ({ page }) => {
    await toggleVendor(page, 'Samsung');
    await waitForShelf(page, 7);
    await page.locator('.sort select').selectOption('lowestprice');
    await expect(page.locator('.shelf-container .shelf-item__title').first()).toHaveText('Galaxy S9');
    expect(await shelfPrices(page)).toEqual([699, 899, 999, 999, 1199, 1299, 1399]);
  });
});

test.describe('image_not_loading_user', () => {
  test('shows product cards without images', async ({ page }) => {
    await signIn(page, 'image_not_loading_user');
    await waitForShelf(page);
    const srcs = await page.locator('.shelf-container .shelf-item__thumb img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    expect(srcs).toHaveLength(TOTAL_PRODUCTS);
    expect(srcs.every((s) => s === '')).toBe(true);
  });

  test('other users see product images', async ({ page }) => {
    await signIn(page, 'demouser');
    await waitForShelf(page);
    const srcs = await page.locator('.shelf-container .shelf-item__thumb img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    expect(srcs.every((s) => s && s.length > 0)).toBe(true);
  });
});
