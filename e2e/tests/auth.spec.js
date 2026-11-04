const { test, expect } = require('@playwright/test');
const { fillSignIn, signIn, chooseOption, waitForShelf } = require('./helpers');

test.describe('sign in page', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/signin');
    await expect(page).toHaveTitle('StackDemo');
    await expect(page.locator('img[alt="BrowserStack"]')).toBeVisible();
    await expect(page.locator('#username')).toContainText('Select Username');
    await expect(page.locator('#password')).toContainText('Select Password');
    await expect(page.locator('#login-btn')).toHaveText('Log In');
  });

  test('lists accepted usernames and the password hint', async ({ page }) => {
    await page.goto('/signin');
    await page.locator('#username').click();
    const menu = page.locator('#username [class*="menu"]');
    await expect(menu).toContainText('Accepted usernames are');
    for (const user of ['demouser', 'image_not_loading_user', 'existing_orders_user', 'fav_user', 'locked_user']) {
      await expect(menu.getByText(user, { exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await page.locator('#password').click();
    await expect(page.locator('#password [class*="menu"]')).toContainText('Password for all users');
    await expect(page.locator('#password [class*="menu"]').getByText('testingisfun99', { exact: true })).toBeVisible();
  });

  test('selecting options from the dropdown signs in', async ({ page }) => {
    await page.goto('/signin');
    await page.locator('#username').click();
    await page.locator('#username [class*="menu"]').getByText('fav_user', { exact: true }).click();
    await page.locator('#password').click();
    await page.locator('#password [class*="menu"]').getByText('testingisfun99', { exact: true }).click();
    await page.locator('#login-btn').click();
    await expect(page).toHaveURL(/\/\?signin=true$/);
    await expect(page.locator('.username')).toHaveText('fav_user');
  });
});

test.describe('valid users', () => {
  for (const user of ['demouser', 'image_not_loading_user', 'existing_orders_user', 'fav_user']) {
    test(`${user} can sign in and log out`, async ({ page }) => {
      await signIn(page, user);
      await expect(page.locator('#signin')).toHaveText('Logout');
      await waitForShelf(page);
      await page.locator('#signin').click();
      await expect(page.locator('#signin')).toHaveText('Sign In');
      await expect(page.locator('.username')).toHaveCount(0);
      expect(await page.evaluate(() => sessionStorage.getItem('username'))).toBeNull();
    });
  }

  test('a signed-in user visiting /signin is sent home', async ({ page }) => {
    await signIn(page, 'demouser');
    await page.goto('/signin');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.username')).toHaveText('demouser');
  });

  test('Sign In link opens the sign in page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#signin').click();
    await expect(page).toHaveURL(/\/signin$/);
  });
});

test.describe('invalid credentials', () => {
  const cases = [
    ['locked_user', 'testingisfun99', 'Your account has been locked.'],
    ['unknown_user', 'testingisfun99', 'Invalid Username'],
    ['demouser', 'wrongpassword', 'Invalid Password'],
  ];
  for (const [user, password, message] of cases) {
    test(`${user} / ${password} shows "${message}"`, async ({ page }) => {
      await page.goto('/signin');
      await fillSignIn(page, user, password);
      await expect(page.locator('.api-error')).toHaveText(message);
      await expect(page).toHaveURL(/\/signin$/);
      expect(await page.evaluate(() => sessionStorage.getItem('username'))).toBeNull();
    });
  }

  test('submitting an empty form shows Invalid Username', async ({ page }) => {
    await page.goto('/signin');
    await page.locator('#login-btn').click();
    await expect(page.locator('.api-error')).toHaveText('Invalid Username');
  });

  test('error clears on the next attempt and a valid login succeeds', async ({ page }) => {
    await page.goto('/signin');
    await fillSignIn(page, 'locked_user');
    await expect(page.locator('.api-error')).toBeVisible();
    await chooseOption(page, '#username', 'demouser');
    await page.locator('#login-btn').click();
    await expect(page).toHaveURL(/\/\?signin=true$/);
  });
});

test.describe('protected pages redirect to sign in and back', () => {
  for (const name of ['favourites', 'orders', 'offers']) {
    test(`/${name}`, async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 19.07, longitude: 72.87 });
      await page.goto('/');
      await waitForShelf(page);
      await page.locator(`#${name}`).click();
      await expect(page).toHaveURL(new RegExp(`/signin\\?${name}=true$`));
      await fillSignIn(page, 'demouser');
      await expect(page).toHaveURL(new RegExp(`/${name}$`));
      await expect(page.locator('.username')).toHaveText('demouser');
    });
  }

  test('/checkout with an empty cart goes to sign in', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/signin\?checkout=true$/);
  });

  test('/confirmation without an order goes home', async ({ page }) => {
    await page.goto('/confirmation');
    await expect(page).toHaveURL(/\/$/);
  });
});
