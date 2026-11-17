const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createClient } = require('graphql-ws');
const { auditServer } = require('graphql-http');
const { startWs, sleep, stats } = require('./helpers');

let sut;
before(async () => { sut = await startWs(); });
after(async () => {
  sut.server.graphqlWss.clients.forEach((c) => c.terminate());
  await sut.close();
});
beforeEach(() => stats.reset());

const gql = async (body, { path = '/graphql', headers = {}, query = '' } = {}) => {
  const startedAt = Date.now();
  const res = await fetch(sut.httpUrl(`${path}${query}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), elapsed: Date.now() - startedAt };
};

test('echo answers and the operation is counted under its name for the run', async () => {
  const r = await gql({ query: 'query Echo { echo(message: "hi") }', operationName: 'Echo' }, { query: '?run=g1' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { data: { echo: 'hi' } });
  const g = stats.snapshot('g1').graphql;
  assert.deepEqual(g.operations, { 'query Echo ok': 1 });
  assert.deepEqual(g.httpStatus, { 200: 1 });
});

test('anonymous operations are counted as "anonymous"', async () => {
  await gql({ query: '{ echo(message: "a") }' }, { headers: { 'x-sut-run': 'anon' } });
  assert.deepEqual(stats.snapshot('anon').graphql.operations, { 'query anonymous ok': 1 });
});

test('delay(ms) sets the response-time floor', async () => {
  const r = await gql({ query: '{ delay(ms: 300) { ms } }' });
  assert.equal(r.body.data.delay.ms, 300);
  assert.ok(r.elapsed >= 295 && r.elapsed < 700, `elapsed ${r.elapsed} ms`);
});

test('items(count, bytes) returns exactly that payload; oversize input is BAD_USER_INPUT', async () => {
  const r = await gql({ query: '{ items(count: 3, bytes: 100) { id filler } }' });
  assert.equal(r.body.data.items.length, 3);
  assert.ok(r.body.data.items.every((i) => i.filler.length === 100));
  const big = await gql({ query: '{ items(count: 100000, bytes: 100000) { id } }' });
  assert.equal(big.body.errors[0].extensions.code, 'BAD_USER_INPUT');
});

test('fail raises a GraphQL error with HTTP 200; mixed with a good field it is partial data', async () => {
  const r = await gql({ query: 'query Bad { fail(code: "DOWNSTREAM", message: "boom") }', operationName: 'Bad' }, { query: '?run=e' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.fail, null);
  assert.equal(r.body.errors.length, 1);
  assert.deepEqual(r.body.errors[0].extensions, { code: 'DOWNSTREAM' });
  assert.equal(r.body.errors[0].message, 'boom');

  const p = await gql({ query: 'query Mixed { echo(message: "ok") fail }', operationName: 'Mixed' }, { query: '?run=e' });
  assert.equal(p.body.data.echo, 'ok');
  assert.equal(p.body.errors[0].extensions.code, 'SUT_INJECTED');
  const g = stats.snapshot('e').graphql;
  assert.deepEqual(g.operations, { 'query Bad error': 1, 'query Mixed partial': 1 });
  assert.equal(g.graphqlErrors, 2);
});

test('node { child ... } resolves as deep as the query nests', async () => {
  const r = await gql({ query: '{ node { child { child { child { child { level } } } } } }' });
  assert.equal(r.body.data.node.child.child.child.child.level, 5);
});

test('mutations run and are labelled as mutations', async () => {
  const r = await gql({ query: 'mutation Create { createItem(name: "x", delayMs: 50) { id name } }' }, { query: '?run=m' });
  assert.equal(r.body.data.createItem.name, 'x');
  assert.deepEqual(stats.snapshot('m').graphql.operations, { 'mutation Create ok': 1 });
});

test('GET works for queries and is refused for mutations', async () => {
  const q = encodeURIComponent('{ echo(message: "get") }');
  const res = await fetch(sut.httpUrl(`/graphql?query=${q}`), { headers: { Accept: 'application/json' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { data: { echo: 'get' } });
  const m = encodeURIComponent('mutation { createItem(name: "x") { id } }');
  const refused = await fetch(sut.httpUrl(`/graphql?query=${m}`), { headers: { Accept: 'application/json' } });
  assert.equal(refused.status, 405);
});

test('status knob answers with that HTTP status without executing; delayMs delays; bad knobs are a 400', async () => {
  const r = await gql({ query: '{ echo(message: "x") }' }, { headers: { 'x-sut-status': '503', 'x-sut-run': 's' } });
  assert.equal(r.status, 503);
  assert.equal(r.body.errors[0].message, 'sut: injected HTTP 503');
  assert.deepEqual(r.body.errors[0].extensions, { code: 'HTTP_503' });
  const limited = await gql({ query: '{ echo(message: "x") }' }, { query: '?status=429&run=s' });
  assert.equal(limited.status, 429);
  const g = stats.snapshot('s').graphql;
  assert.deepEqual(g.operations, {});
  assert.deepEqual(g.httpStatus, { 503: 1, 429: 1 });

  const slow = await gql({ query: '{ echo(message: "x") }' }, { query: '?delayMs=200' });
  assert.ok(slow.elapsed >= 195);
  assert.equal((await gql({ query: '{ echo(message: "x") }' }, { query: '?status=200' })).status, 400);
  assert.equal((await gql({ query: '{ echo(message: "x") }' }, { headers: { 'x-sut-delay-ms': 'soon' } })).status, 400);
});

test('introspection works on /graphql and is refused on /graphql-nointrospect', async () => {
  const query = '{ __schema { queryType { name } } }';
  const on = await gql({ query });
  assert.equal(on.body.data.__schema.queryType.name, 'Query');
  const off = await gql({ query }, { path: '/graphql-nointrospect' });
  assert.equal(off.body.data, undefined);
  assert.match(off.body.errors[0].message, /introspection/i);
  assert.equal((await gql({ query: '{ echo(message: "x") }' }, { path: '/graphql-nointrospect' })).body.data.echo, 'x');
});

test('subscriptions over graphql-transport-ws send exactly count ticks, then complete', async () => {
  const client = createClient({ url: `${sut.url('/graphql')}?run=sub`, webSocketImpl: WebSocket, lazy: false, retryAttempts: 0 });
  const ticks = [];
  const startedAt = Date.now();
  await new Promise((resolve, reject) => {
    client.subscribe({ query: 'subscription { ticks(count: 3, intervalMs: 100) { seq of } }' }, {
      next: (msg) => ticks.push(msg.data.ticks),
      error: reject,
      complete: resolve,
    });
  });
  const took = Date.now() - startedAt;
  await client.dispose();
  assert.deepEqual(ticks, [{ seq: 1, of: 3 }, { seq: 2, of: 3 }, { seq: 3, of: 3 }]);
  assert.ok(took >= 195, `took ${took} ms`);
  await sleep(50);
  const g = stats.snapshot('sub').graphql;
  assert.equal(g.ticksSent, 3);
  assert.equal(g.wsConnections, 1);
  assert.equal(g.subscriptionsStarted, 1);
  assert.equal(g.subscriptionsCompleted, 1);
});

test('without graphql-transport-ws: an unknown subprotocol fails the handshake, none at all is closed with 4406', async () => {
  // graphql-ws accepts the upgrade without selecting a protocol, so a client that offered one
  // fails the handshake itself (RFC 6455 4.1) before the server's 4406 arrives.
  const unknown = await new Promise((resolve) => {
    const ws = new WebSocket(sut.url('/graphql'), 'not-graphql');
    let error = null;
    ws.on('error', (err) => { error = err.message; });
    ws.on('close', (code) => resolve({ code, error }));
  });
  assert.equal(unknown.code, 1006);
  assert.match(unknown.error, /no subprotocol/i);

  const none = await new Promise((resolve) => {
    const ws = new WebSocket(sut.url('/graphql'));
    ws.on('close', (code) => resolve(code));
    ws.on('error', () => {});
  });
  assert.equal(none, 4406);
});

test('graphql-http audit: every MUST requirement of GraphQL over HTTP passes', async () => {
  const results = await auditServer({ url: sut.httpUrl('/graphql') });
  const failedMust = results.filter((r) => r.status !== 'ok' && /MUST/.test(r.name));
  assert.deepEqual(failedMust.map((r) => `${r.name}: ${r.reason}`), []);
});
