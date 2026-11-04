const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { signIn, fillSignIn, waitForShelf, addToCart, cartItems } = require('./helpers');

async function fillShipping(page) {
  await page.locator('#firstNameInput').fill('Jane');
  await page.locator('#lastNameInput').fill('Doe');
  await page.locator('#addressLine1Input').fill('1 Test Street');
  await page.locator('#provinceInput').fill('Maharashtra');
  await page.locator('#postCodeInput').fill('400001');
}

test('signed-in user completes a purchase end to end', async ({ page }) => {
  await signIn(page, 'demouser');
  await waitForShelf(page);
  await addToCart(page, 1);
  await addToCart(page, 10);
  await cartItems(page).nth(1).locator('.change-product-button').nth(1).click();
  await expect(page.locator('.sub-price__val')).toHaveText('$ 2797.00');
  await page.locator('.buy-btn').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('.checkoutHeader-link')).toHaveText('StackDemo');
  await expect(page.locator('[data-test="shipping-address-heading"]')).toHaveText('Shipping Address');
  await expect(page.locator('.cart-section-heading')).toHaveText('3 item(s)');
  await expect(page.locator('.productList-item')).toHaveCount(2);
  await expect(page.locator('.productList-item .product-title')).toHaveText(['iPhone 12', 'Galaxy S20']);
  await expect(page.locator('.productList-item .product-price')).toHaveText(['$799', '$1998']);
  await expect(page.locator('.cart-priceItem-value')).toHaveText('$2797.00');
  for (const label of ['First Name', 'Last Name', 'Address', 'State/Province', 'Postal Code']) {
    await expect(page.locator('label.form-label', { hasText: label })).toBeVisible();
  }

  // Required fields block submission.
  await page.locator('#checkout-shipping-continue').click();
  await expect(page).toHaveURL(/\/checkout$/);

  await fillShipping(page);
  await page.locator('#checkout-shipping-continue').click();

  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.locator('#confirmation-message')).toHaveText('Your Order has been successfully placed.');
  await expect(page.getByText(/Your order number is \d+/)).toBeVisible();
  await expect(page.locator('.cart-section-heading')).toHaveText('3 item(s)');
  await expect(page.locator('.productList-item .product-title')).toHaveText(['iPhone 12', 'Galaxy S20']);
  await expect(page.locator('.cart-priceItem-value')).toHaveText('$2797.00');

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#downloadpdf').click()]);
  expect(download.suggestedFilename()).toBe('confirmation.pdf');
  const pdf = fs.readFileSync(await download.path());
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(1000);

  await page.getByRole('button', { name: 'Continue Shopping »' }).click();
  await expect(page).toHaveURL(/\/$/);
  await waitForShelf(page);
  await expect(page.locator('.bag--float-cart-closed .bag__quantity')).toHaveText('0');

  await page.locator('#orders').click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.locator('.order')).toHaveCount(1);
  const order = page.locator('.order').first();
  await expect(order.locator('.order-info')).toContainText('$2797');
  await expect(order.locator('.order-info')).toContainText('demouser');
  await expect(order.locator('.item-image')).toHaveCount(2);
  await expect(order).toContainText('Title: iPhone 12');
  await expect(order).toContainText('Title: Galaxy S20');
  await expect(order).toContainText('$1998.00');
});

test('checkout after signing in from the cart keeps the cart', async ({ page }) => {
  await page.goto('/');
  await waitForShelf(page);
  await addToCart(page, 20);
  await page.locator('.buy-btn').click();
  await expect(page).toHaveURL(/\/signin\?checkout=true$/);
  await fillSignIn(page, 'fav_user');
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('.productList-item .product-title')).toHaveText(['One Plus 8']);
  await fillShipping(page);
  await page.locator('#checkout-shipping-continue').click();
  await expect(page.locator('#confirmation-message')).toBeVisible();
});

test('signed-in user with an empty cart is sent home from /checkout', async ({ page }) => {
  await signIn(page, 'demouser');
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/$/);
});

test.describe('orders page', () => {
  test('existing_orders_user sees seeded orders', async ({ page }) => {
    await signIn(page, 'existing_orders_user');
    await page.locator('#orders').click();
    await expect(page.locator('.order')).toHaveCount(5);
    const first = page.locator('.order').first();
    await expect(first.locator('.order-info')).toContainText('Order placed');
    await expect(first.locator('.order-info')).toContainText('$125');
    await expect(first.locator('.order-info')).toContainText('existing_orders_user');
    await expect(first.locator('.item-image')).toHaveCount(5);
    await expect(first.getByText(/^Delivered /)).toBeVisible();
  });

  test('demouser sees no orders', async ({ page }) => {
    await signIn(page, 'demouser');
    await page.locator('#orders').click();
    await expect(page.getByText('No orders found')).toBeVisible();
  });

  test('new orders are listed before seeded ones', async ({ page }) => {
    await signIn(page, 'existing_orders_user');
    await waitForShelf(page);
    await addToCart(page, 19);
    await page.locator('.buy-btn').click();
    await fillShipping(page);
    await page.locator('#checkout-shipping-continue').click();
    await expect(page.locator('#confirmation-message')).toBeVisible();
    await page.goto('/orders');
    await expect(page.locator('.order')).toHaveCount(6);
    await expect(page.locator('.order').first()).toContainText('Title: Pixel 2');
  });
});
