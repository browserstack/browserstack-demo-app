const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const { startWs, connect, sleep, stats } = require('./helpers');
const { createResetServer } = require('../src/reset-server');
const { describeAuth } = require('../src/log');

let sut;
before(async () => { sut = await startWs(); });
after(async () => { await sut.close(); });
beforeEach(() => stats.reset());

test('/echo echoes every text and binary frame and counts them for the run', async () => {
  const c = await connect(sut.url('/echo?run=r1&leg=ignored'));
  c.ws.send('a');
  c.ws.send('b');
  c.ws.send(Buffer.from([1, 2, 3]), { binary: true });
  await sleep(100);
  assert.deepEqual(c.messages.slice(0, 2), ['a', 'b']);
  assert.equal(c.messages.length, 3);
  c.ws.close(1000);
  await c.closed;
  await sleep(20);
  const s = stats.snapshot('r1').ws;
  assert.equal(s.upgradesAccepted, 1);
  assert.equal(s.msgsIn, 3);
  assert.equal(s.msgsOut, 3);
  assert.deepEqual(s.closes, { 1000: 1 });
  assert.equal(s.open, 0);
});

test('/hold closes N ms after the 101 with code 1000 by default, or the requested code', async () => {
  const c = await connect(sut.url('/hold?ms=300'));
  await c.closed;
  assert.equal(c.closeCode, 1000);
  const held = c.closedAt - c.openedAt;
  assert.ok(held >= 290 && held < 600, `held ${held} ms`);

  const d = await connect(sut.url('/hold?ms=50&code=1001'));
  await d.closed;
  assert.equal(d.closeCode, 1001);
});

test('/close sends the requested code straight away; reserved or missing codes are a 400', async () => {
  for (const code of [1000, 1001, 1008, 1011, 4000]) {
    const c = await connect(sut.url(`/close?code=${code}`));
    await c.closed;
    assert.equal(c.closeCode, code);
  }
  assert.equal((await connect(sut.url('/close?code=1006'))).status, 400);
  assert.equal((await connect(sut.url('/close'))).status, 400);
});

test('/stats counts the code the server sent for a server-initiated close, and the client code otherwise', async () => {
  const server = await connect(sut.url('/close?code=1001&run=cc'));
  await server.closed;
  const client = await connect(sut.url('/echo?run=cc'));
  client.ws.close(1008);
  await client.closed;
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(stats.snapshot('cc').ws.closes, { 1001: 1, 1008: 1 });
});

test('/drop kills the connection with no close frame (1006), also after ms', async () => {
  const c = await connect(sut.url('/drop?run=d'));
  await c.closed;
  assert.equal(c.closeCode, 1006);

  const late = await connect(sut.url('/hold?ms=150&drop=1&run=d'));
  await late.closed;
  assert.equal(late.closeCode, 1006);
  assert.ok(late.closedAt - late.openedAt >= 140);
  await sleep(20);
  assert.equal(stats.snapshot('d').ws.closes['1006'], 2);
});

test('/push sends exactly n extra messages; echo=0 stops echoing', async () => {
  const c = await connect(sut.url('/push?n=5&echo=0&run=p'));
  ['x', 'y', 'z'].forEach((m) => c.ws.send(m));
  await sleep(150);
  assert.deepEqual(c.messages, ['push 1/5', 'push 2/5', 'push 3/5', 'push 4/5', 'push 5/5']);
  c.ws.close();
  await c.closed;
  const s = stats.snapshot('p').ws;
  assert.equal(s.msgsIn, 3);
  assert.equal(s.msgsOut, 5);

  const spaced = await connect(sut.url('/push?n=3&pushIntervalMs=100'));
  await sleep(150);
  assert.equal(spaced.messages.length, 1);
  await sleep(250);
  assert.equal(spaced.messages.length, 3);
  spaced.ws.close();
});

test('knobs compose on one connection: push + hold + close code', async () => {
  const c = await connect(sut.url('/hold?ms=200&n=4&code=1001'));
  c.ws.send('hello');
  await c.closed;
  assert.equal(c.closeCode, 1001);
  assert.deepEqual(c.messages.sort(), ['hello', 'push 1/4', 'push 2/4', 'push 3/4', 'push 4/4'].sort());
});

test('x-sut-* headers set knobs and win over the query string', async () => {
  const c = await connect(sut.url('/hold?ms=5000&run=q'), {
    headers: { 'x-sut-ms': '100', 'x-sut-code': '1001', 'x-sut-upgrade-delay-ms': '150', 'x-sut-run': 'hdr' },
  });
  assert.ok(c.openedAt - c.startedAt >= 145);
  await c.closed;
  assert.equal(c.closeCode, 1001);
  assert.ok(c.closedAt - c.openedAt < 1000);
  assert.equal(stats.snapshot('hdr').ws.upgradesAccepted, 1);
  assert.equal(stats.snapshot('q'), null);
  assert.equal((await connect(sut.url('/reject'), { headers: { 'x-sut-status': '503' } })).status, 503);
  assert.equal((await connect(sut.url('/echo'), { headers: { 'x-sut-ms': 'soon' } })).status, 400);
});

test('/reject refuses the upgrade with 403 by default or the requested status', async () => {
  assert.equal((await connect(sut.url('/reject?run=rj'))).status, 403);
  assert.equal((await connect(sut.url('/reject?status=503&run=rj'))).status, 503);
  assert.equal((await connect(sut.url('/reject?status=429&run=rj'))).status, 429);
  assert.equal((await connect(sut.url('/reject?status=200'))).status, 400);
  assert.deepEqual(stats.snapshot('rj').ws.upgradesRejected, { 403: 1, 503: 1, 429: 1 });
});

test('upgradeDelayMs sets the connect-time floor, for accepted and rejected upgrades', async () => {
  const c = await connect(sut.url('/echo?upgradeDelayMs=300'));
  const connectMs = c.openedAt - c.startedAt;
  assert.ok(connectMs >= 295 && connectMs < 600, `connect ${connectMs} ms`);
  c.ws.close();

  const startedAt = Date.now();
  const r = await connect(sut.url('/reject?upgradeDelayMs=200'));
  assert.equal(r.status, 403);
  assert.ok(Date.now() - startedAt >= 195);
});

test('pings get a pong straight away, or after pongDelayMs', async () => {
  const rtt = async (url) => {
    const c = await connect(url);
    const sentAt = Date.now();
    const ms = await new Promise((resolve) => {
      c.ws.once('pong', () => resolve(Date.now() - sentAt));
      c.ws.ping('p');
    });
    c.ws.close();
    return ms;
  };
  assert.ok((await rtt(sut.url('/echo'))) < 100);
  const delayed = await rtt(sut.url('/echo?pongDelayMs=250&run=pg'));
  assert.ok(delayed >= 245 && delayed < 500, `pong after ${delayed} ms`);
  assert.equal(stats.snapshot('pg').ws.pongsOut, 1);
});

test('peak concurrent sessions is tracked per run', async () => {
  const conns = await Promise.all([1, 2, 3].map(() => connect(sut.url('/hold?ms=200&run=pk'))));
  await Promise.all(conns.map((c) => c.closed));
  const one = await connect(sut.url('/hold?ms=10&run=pk'));
  await one.closed;
  await sleep(20);
  const s = stats.snapshot('pk').ws;
  assert.equal(s.peakConcurrent, 3);
  assert.equal(s.upgradesAccepted, 4);
  assert.equal(s.open, 0);
});

test('unknown paths are a 404 and malformed knobs a 400; unknown params are ignored', async () => {
  assert.equal((await connect(sut.url('/nope'))).status, 404);
  assert.equal((await connect(sut.url('/hold'))).status, 400);
  assert.equal((await connect(sut.url('/hold?ms=abc'))).status, 400);
  assert.equal((await connect(sut.url('/echo?upgradeDelayMs=-5'))).status, 400);
  assert.equal((await connect(sut.url('/push'))).status, 400);
  const ok = await connect(sut.url('/echo?leg=x&foo=bar'));
  assert.equal(ok.error, null);
  ok.ws.close();
});

test('an Authorization header is accepted and counted, never required', async () => {
  const c = await connect(sut.url('/echo?run=auth'), { headers: { Authorization: 'Bearer abc123' } });
  c.ws.close();
  const d = await connect(sut.url('/echo?run=auth'));
  d.ws.close();
  await Promise.all([c.closed, d.closed]);
  const s = stats.snapshot('auth').ws;
  assert.equal(s.upgradesAccepted, 2);
  assert.equal(s.authHeaders, 1);
});

test('only a known Authorization scheme is logged by name; never the credential', () => {
  assert.equal(describeAuth('Bearer abc123').scheme, 'Bearer');
  assert.equal(describeAuth('private-token').scheme, 'unknown');
  assert.equal(describeAuth('Weird abc123').scheme, 'unknown');
  const d = describeAuth('private-token');
  assert.equal(d.length, 13);
  assert.ok(!JSON.stringify(d).includes('private-token'));
});

test('HTTP helpers: /http/<status>, 426 on WS paths, /stats and /reset', async () => {
  const ok = await fetch(sut.httpUrl('/http/200?run=h'));
  assert.equal(ok.status, 200);
  const limited = await fetch(sut.httpUrl('/http/429?run=h'));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '1');
  assert.equal((await fetch(sut.httpUrl('/http/700'))).status, 400);
  assert.equal((await fetch(sut.httpUrl('/http/200?delayMs=x'))).status, 400);
  const delayedAt = Date.now();
  assert.equal((await fetch(sut.httpUrl('/http/200?delayMs=150'))).status, 200);
  assert.ok(Date.now() - delayedAt >= 145);
  assert.equal((await fetch(sut.httpUrl('/echo'))).status, 426);
  assert.equal((await fetch(sut.httpUrl('/missing-1?run=h'))).status, 404);
  assert.equal((await fetch(sut.httpUrl('/missing-2?run=h'))).status, 404);

  const body = await (await fetch(sut.httpUrl('/stats?run=h'))).json();
  // Unknown paths share one key.
  assert.deepEqual(body.http, { '/http/200 200': 1, '/http/429 429': 1, '* 404': 2 });
  assert.equal((await fetch(sut.httpUrl('/stats?run=missing'))).status, 404);
  assert.equal((await fetch(sut.httpUrl('/reset?run=h'), { method: 'POST' })).status, 200);
  assert.equal(stats.snapshot('h'), null);
  const index = await (await fetch(sut.httpUrl('/'))).json();
  assert.ok(index.websocket['/echo']);
});

test('the reset listener resets every connection on accept', async () => {
  const server = createResetServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const outcome = await new Promise((resolve) => {
    const socket = net.connect(server.address().port, '127.0.0.1');
    socket.on('error', (err) => resolve(err.code));
    socket.on('close', () => resolve('closed'));
  });
  server.close();
  assert.equal(outcome, 'ECONNRESET');
});
