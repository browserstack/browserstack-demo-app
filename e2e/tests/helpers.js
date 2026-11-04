const { expect } = require('@playwright/test');

const PASSWORD = 'testingisfun99';
const TOTAL_PRODUCTS = 25;
const VENDOR_COUNTS = { Apple: 9, Samsung: 7, Google: 3, OnePlus: 6 };

// react-select Creatable: typing an existing option and pressing Enter selects it,
// typing anything else creates (and selects) a new value.
async function chooseOption(page, selector, value) {
  // The placeholder overlays the input, so focus it through the control.
  await page.locator(selector).click();
  const input = page.locator(`${selector} input`);
  await input.fill(value);
  await input.press('Enter');
}

async function fillSignIn(page, userName, password = PASSWORD) {
  await expect(page.locator('#login-btn')).toBeVisible();
  await chooseOption(page, '#username', userName);
  await chooseOption(page, '#password', password);
  await page.locator('#login-btn').click();
}

async function signIn(page, userName, password = PASSWORD) {
  await page.goto('/signin');
  await fillSignIn(page, userName, password);
  await expect(page).toHaveURL(/\/\?signin=true$/);
  await expect(page.locator('.username')).toHaveText(userName);
}

async function waitForShelf(page, count = TOTAL_PRODUCTS) {
  await expect(page.locator('.shelf-container .shelf-item')).toHaveCount(count);
  await expect(page.locator('.products-found')).toHaveText(`${count} Product(s) found.`);
}

function product(page, id) {
  return page.locator(`.shelf-container .shelf-item[id="${id}"]`);
}

async function addToCart(page, id) {
  await product(page, id).locator('.shelf-item__buy-btn').click();
  await expect(page.locator('.float-cart')).toHaveClass(/float-cart--open/);
}

// At desktop widths the header overlaps the close button (as on production), so a
// pointer click never reaches it; dispatch the click to exercise the close handler.
async function closeCart(page) {
  await page.locator('.float-cart__close-btn').dispatchEvent('click');
  await expect(page.locator('.float-cart')).not.toHaveClass(/float-cart--open/);
}

function cartItems(page) {
  return page.locator('.float-cart__shelf-container .shelf-item');
}

async function toggleVendor(page, vendor) {
  await page.locator('.filters .checkmark', { hasText: new RegExp(`^${vendor}$`) }).click();
}

async function shelfPrices(page) {
  const texts = await page.locator('.shelf-container .shelf-item .val b').allTextContents();
  return texts.map(Number);
}

module.exports = {
  PASSWORD,
  TOTAL_PRODUCTS,
  VENDOR_COUNTS,
  chooseOption,
  fillSignIn,
  signIn,
  waitForShelf,
  product,
  addToCart,
  closeCart,
  cartItems,
  toggleVendor,
  shelfPrices,
};
