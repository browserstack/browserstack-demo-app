const { test, expect } = require('@playwright/test');
const products = require('../../src/constants/products.json');
const orders = require('../../src/constants/orders.json');
const offers = require('../../src/constants/offers.json');

const PASSWORD = 'testingisfun99';

test.describe('GET /api/products', () => {
  test('returns the full catalogue with no favourites for anonymous users', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(25);
    expect(body.products.every((p) => p.isFav === false)).toBe(true);
    expect(body.products.map((p) => p.id)).toEqual(products.products.map((p) => p.id));
    expect(body.products[0]).toEqual({ ...products.products[0], isFav: false });
  });

  test('marks the first five products as favourites for fav_user', async ({ request }) => {
    const res = await request.get('/api/products', { params: { userName: 'fav_user' } });
    expect(res.status()).toBe(200);
    const { products: list } = await res.json();
    expect(list).toHaveLength(25);
    expect(list.filter((p) => p.isFav).map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
  });

  test('does not mark favourites for other users', async ({ request }) => {
    const res = await request.get('/api/products', { params: { userName: 'demouser' } });
    const { products: list } = await res.json();
    expect(list.some((p) => p.isFav)).toBe(false);
  });
});

test.describe('GET /api/orders', () => {
  test('returns all orders for existing_orders_user', async ({ request }) => {
    const res = await request.get('/api/orders', { params: { userName: 'existing_orders_user' } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ orders: orders.orders });
  });

  for (const userName of ['demouser', 'fav_user', undefined]) {
    test(`returns 404 for ${userName || 'anonymous'}`, async ({ request }) => {
      const res = await request.get('/api/orders', { params: userName ? { userName } : {} });
      expect(res.status()).toBe(404);
      expect(await res.json()).toEqual({ message: 'No orders found' });
    });
  }
});

test.describe('GET /api/offers', () => {
  const cities = {
    mumbai: [19, 72],
    london: [51, 0],
    'san francisco': [37, -122],
    singapore: [1, 103],
    sydney: [-33, 151],
  };
  for (const [city, [latitude, longitude]] of Object.entries(cities)) {
    test(`returns offers near ${city}`, async ({ request }) => {
      const res = await request.get('/api/offers', { params: { latitude, longitude } });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ offersData: offers });
    });
  }

  test('matches within a +/-3 degree window', async ({ request }) => {
    const edge = await request.get('/api/offers', { params: { latitude: 22, longitude: 75 } });
    expect(edge.status()).toBe(200);
    const outside = await request.get('/api/offers', { params: { latitude: 23, longitude: 72 } });
    expect(outside.status()).toBe(404);
  });

  test('returns 404 when no city matches', async ({ request }) => {
    const res = await request.get('/api/offers', { params: { latitude: 40, longitude: 10 } });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ cityName: '' });
  });

  test('returns 404 without coordinates', async ({ request }) => {
    const res = await request.get('/api/offers');
    expect(res.status()).toBe(404);
  });
});

test.describe('POST /api/signin', () => {
  for (const userName of ['demouser', 'image_not_loading_user', 'existing_orders_user', 'fav_user']) {
    test(`accepts ${userName}`, async ({ request }) => {
      const res = await request.post('/api/signin', { data: { userName, password: PASSWORD } });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({});
    });
  }

  const failures = [
    ['unknown user', { userName: 'nobody', password: PASSWORD }, 'Invalid Username'],
    ['wrong password', { userName: 'demouser', password: 'nope' }, 'Invalid Password'],
    ['locked user', { userName: 'locked_user', password: PASSWORD }, 'Your account has been locked.'],
    ['empty body', {}, 'Invalid Username'],
  ];
  for (const [name, data, errorMessage] of failures) {
    test(`rejects ${name}`, async ({ request }) => {
      const res = await request.post('/api/signin', { data });
      expect(res.status()).toBe(422);
      expect(await res.json()).toEqual({ errorMessage });
    });
  }
});

test.describe('POST /api/checkout', () => {
  test('accepts a valid user', async ({ request }) => {
    const res = await request.post('/api/checkout', { data: { userName: 'demouser' } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({});
  });

  for (const userName of ['locked_user', 'nobody']) {
    test(`rejects ${userName}`, async ({ request }) => {
      const res = await request.post('/api/checkout', { data: { userName } });
      expect(res.status()).toBe(422);
      expect(await res.json()).toEqual({});
    });
  }
});

test('GET /api/doc serves the OpenAPI spec for every documented route', async ({ request }) => {
  const res = await request.get('/api/doc');
  expect(res.status()).toBe(200);
  const spec = await res.json();
  expect(spec.openapi).toBe('3.0.0');
  expect(spec.info).toMatchObject({ title: 'BrowserStack Demo API', version: '1.0.0' });
  expect(Object.keys(spec.paths).sort()).toEqual([
    '/api/checkout',
    '/api/control/error/client-fail',
    '/api/control/error/redirect-temp',
    '/api/control/error/server-fail',
    '/api/control/error/success',
    '/api/control/latency/avg',
    '/api/control/latency/p99-outlier',
    '/api/control/latency/threshold',
    '/api/offers',
    '/api/orders',
    '/api/products',
    '/api/signin',
    '/api/zero/errors',
  ]);
});

test.describe('SUT control endpoints', () => {
  const endpoints = [
    '/api/control/latency/avg',
    '/api/control/latency/p99-outlier',
    '/api/control/latency/threshold',
    '/api/control/error/success',
    '/api/control/error/client-fail',
    '/api/control/error/server-fail',
    '/api/control/error/redirect-temp',
    '/api/zero/errors',
  ];

  for (const path of endpoints) {
    test(`${path} requires a server-side SUT session`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required' });
    });
  }

  // The SUT login stores sessions in the browser bundle only, so the server never
  // recognises the cookie. This pins that existing behaviour.
  test('an unknown sutSessionId cookie is still rejected', async ({ request }) => {
    const res = await request.get('/api/control/error/success', {
      headers: { cookie: 'sutSessionId=doesnotexist' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('static and routing', () => {
  for (const path of ['/favicon.svg', '/static/banner.jpg', '/static/bstackdemo_logo.svg', '/static/iPhone12-device-info.png']) {
    test(`serves ${path}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    });
  }

  test('unknown pages render the Next 404 page', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res.status()).toBe(404);
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });

  for (const path of ['/', '/signin', '/checkout', '/confirmation', '/favourites', '/offers', '/orders', '/swagger', '/sut', '/sut/login', '/sut/dashboard', '/sut/ui/zero-cls', '/sut/ui/high-cls', '/sut/ui/high-lcp', '/sut/ui/minimum-inp']) {
    test(`page ${path} responds 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/html');
    });
  }
});
