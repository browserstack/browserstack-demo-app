const { test, expect } = require('@playwright/test');
const { waitForShelf, addToCart, closeCart, cartItems, product } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
});

test('empty cart', async ({ page }) => {
  await expect(page.locator('.bag--float-cart-closed .bag__quantity')).toHaveText('0');
  await page.locator('.bag--float-cart-closed').click();
  await expect(page.locator('.float-cart')).toHaveClass(/float-cart--open/);
  await expect(page.locator('.shelf-empty')).toContainText('Add some products in the bag');
  await expect(page.locator('.sub-price__val')).toHaveText('$ 0.00');
  await expect(page.locator('.buy-btn')).toHaveText('Continue Shopping');
  await page.locator('.buy-btn').click();
  await expect(page.locator('.float-cart')).not.toHaveClass(/float-cart--open/);
});

test('adding a product opens the cart with totals', async ({ page }) => {
  await addToCart(page, 1);
  await expect(cartItems(page)).toHaveCount(1);
  const item = cartItems(page).first();
  await expect(item.locator('.title')).toHaveText('iPhone 12');
  await expect(item.locator('.desc')).toContainText('Apple');
  await expect(item.locator('.desc')).toContainText('Quantity: 1');
  await expect(item.locator('.shelf-item__price p')).toHaveText('$  799.00');
  await expect(page.locator('.float-cart__header .bag__quantity')).toHaveText('1');
  await expect(page.locator('.sub-price__val')).toHaveText('$ 799.00');
  await expect(page.locator('.sub-price__installment')).toHaveText('OR UP TO 9 x $ 88.78');
  await expect(page.locator('.buy-btn')).toHaveText('Checkout');
});

test('adding the same product twice increases quantity', async ({ page }) => {
  await addToCart(page, 1);
  await closeCart(page);
  await addToCart(page, 1);
  await expect(cartItems(page)).toHaveCount(1);
  await expect(cartItems(page).first().locator('.desc')).toContainText('Quantity: 2');
  await expect(page.locator('.sub-price__val')).toHaveText('$ 1598.00');
  await expect(page.locator('.sub-price__installment')).toHaveText('OR UP TO 9 x $ 177.56');
});

test('quantity buttons update totals', async ({ page }) => {
  await addToCart(page, 10);
  const item = cartItems(page).first();
  const [minus, plus] = [item.locator('.change-product-button').nth(0), item.locator('.change-product-button').nth(1)];
  await expect(minus).toBeDisabled();
  await plus.click();
  await plus.click();
  await expect(item.locator('.desc')).toContainText('Quantity: 3');
  await expect(page.locator('.sub-price__val')).toHaveText('$ 2997.00');
  await expect(minus).toBeEnabled();
  await minus.click();
  await expect(item.locator('.desc')).toContainText('Quantity: 2');
  await expect(page.locator('.sub-price__val')).toHaveText('$ 1998.00');
  await expect(page.locator('.float-cart__header .bag__quantity')).toHaveText('2');
});

test('multiple products and removal', async ({ page }) => {
  await addToCart(page, 1);
  await addToCart(page, 17);
  await addToCart(page, 25);
  await expect(cartItems(page)).toHaveCount(3);
  await expect(page.locator('.sub-price__val')).toHaveText('$ 2127.00');
  await cartItems(page).nth(1).locator('.shelf-item__del').click();
  await expect(cartItems(page)).toHaveCount(2);
  await expect(cartItems(page).locator('.title')).toHaveText(['iPhone 12', 'One Plus 6T']);
  await expect(page.locator('.sub-price__val')).toHaveText('$ 1228.00');
  await cartItems(page).first().locator('.shelf-item__del').click();
  await cartItems(page).first().locator('.shelf-item__del').click();
  await expect(page.locator('.shelf-empty')).toBeVisible();
  await expect(page.locator('.sub-price__val')).toHaveText('$ 0.00');
});

test('cart persists across reloads within the session', async ({ page }) => {
  await addToCart(page, 5);
  await addToCart(page, 6);
  await page.reload();
  await waitForShelf(page);
  await expect(page.locator('.bag--float-cart-closed .bag__quantity')).toHaveText('2');
  await page.locator('.bag--float-cart-closed').click();
  await expect(cartItems(page).locator('.title')).toHaveText(['iPhone 11', 'iPhone 11 Pro']);
  await expect(page.locator('.sub-price__val')).toHaveText('$ 1298.00');
});

test('close button collapses the cart', async ({ page }) => {
  await addToCart(page, 2);
  await closeCart(page);
  await expect(page.locator('.bag--float-cart-closed .bag__quantity')).toHaveText('1');
});

test('header overlaps the cart close button at 1280px (existing layout)', async ({ page }) => {
  await addToCart(page, 2);
  await page.waitForTimeout(500);
  const hit = await page.evaluate(() => {
    const r = document.querySelector('.float-cart__close-btn').getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { box: [r.x, r.y, r.width, r.height], className: el.className };
  });
  expect(hit.box).toEqual([780, 75, 50, 50]);
  expect(hit.className).toContain('justify-between');
});

test('checkout requires sign in and returns to checkout afterwards', async ({ page }) => {
  await addToCart(page, 3);
  await page.locator('.buy-btn').click();
  await expect(page).toHaveURL(/\/signin\?checkout=true$/);
  await expect(product(page, 3)).toHaveCount(0);
});
