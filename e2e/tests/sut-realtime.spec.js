const { test, expect } = require('@playwright/test');

// The live tests talk to the realtime SUT (sut/realtime). CI starts it on localhost;
// against a deployment, set SUT_WS_URL (e.g. wss://ws.bstackdemo.com).
const SUT_WS_URL = process.env.SUT_WS_URL || 'ws://localhost:8080';

async function openRealtime(page) {
  await page.goto('/sut/login');
  await page.locator('#login-submit-btn').click();
  await expect(page).toHaveURL(/\/sut\/dashboard$/);
  await page.locator('#realtime-console').click();
  await expect(page).toHaveURL(/\/sut\/realtime$/);
  await expect(page).toHaveTitle('SUT Realtime - WebSocket and gRPC');
  await page.locator('#ws-base').fill(SUT_WS_URL);
}

test('the console builds the URL from the endpoint and only its knobs', async ({ page }) => {
  await openRealtime(page);
  await page.locator('#ws-preset').selectOption('hold');
  await page.locator('#knob-ms').fill('2000');
  await page.locator('#knob-code').fill('1001');
  await page.locator('#knob-upgradeDelayMs').fill('300');
  await page.locator('#knob-run').fill('ui');
  await expect(page.locator('#ws-url')).toHaveText(`${SUT_WS_URL}/hold?ms=2000&code=1001&upgradeDelayMs=300&run=ui`);

  // /reject has no close knobs, so values typed for /hold are not carried over.
  await page.locator('#ws-preset').selectOption('reject');
  await page.locator('#knob-status').fill('503');
  await expect(page.locator('#ws-url')).toHaveText(`${SUT_WS_URL}/reject?upgradeDelayMs=300&status=503&run=ui`);
  await expect(page.locator('#knob-ms')).toHaveCount(0);
});

test('the gRPC reference lists the four LoadSut methods', async ({ page }) => {
  await openRealtime(page);
  const rows = page.locator('#grpc-methods tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.locator('td:first-child')).toHaveText(['Unary', 'ServerStream', 'ClientStream', 'BidiEcho']);
});

test('the GraphQL reference lists every schema field', async ({ page }) => {
  await openRealtime(page);
  await expect(page.locator('#graphql-fields tbody tr')).toHaveCount(7);
  await expect(page.locator('#graphql-fields tbody tr td:first-child').first()).toHaveText('echo(message)');
});

test('live: the GraphQL endpoint answers and counts the operation', async ({ request }) => {
  const http = SUT_WS_URL.replace(/^ws/, 'http');
  const run = `e2e-gql-${Date.now()}`;
  const res = await request.post(`${http}/graphql?run=${run}`, {
    data: { query: 'query E2E { echo(message: "hi") }', operationName: 'E2E' },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ data: { echo: 'hi' } });
  const stats = await (await request.get(`${http}/stats?run=${run}`)).json();
  expect(stats.graphql.operations).toEqual({ 'query E2E ok': 1 });
});

test('live: /push sends n messages, echoes, and the server closes with the requested code', async ({ page }) => {
  await openRealtime(page);
  await page.locator('#ws-preset').selectOption('push');
  await page.locator('#knob-n').fill('2');
  await page.locator('#knob-ms').fill('1500');
  await page.locator('#knob-code').fill('1001');
  await page.locator('#knob-run').fill(`e2e-${Date.now()}`);
  await page.locator('#ws-connect').click();
  await expect(page.locator('#ws-state')).toHaveText('open');
  await page.locator('#ws-message').fill('ping-from-e2e');
  await page.locator('#ws-send').click();
  const log = page.locator('#ws-log');
  await expect(log).toContainText('received: push 1/2');
  await expect(log).toContainText('received: push 2/2');
  await expect(log).toContainText('received: ping-from-e2e');
  await expect(log).toContainText('closed with code 1001 (sut push)');

  await page.locator('#ws-stats').click();
  const stats = JSON.parse(await page.locator('#ws-stats-output').textContent());
  expect(stats.ws).toMatchObject({ upgradesAccepted: 1, msgsIn: 1, msgsOut: 3, closes: { 1001: 1 } });
});

test('live: a rejected upgrade is reported as a failed connection', async ({ page }) => {
  await openRealtime(page);
  await page.locator('#ws-preset').selectOption('reject');
  await page.locator('#ws-connect').click();
  await expect(page.locator('#ws-log')).toContainText('connection failed');
  await expect(page.locator('#ws-state')).toHaveText('closed');
});
