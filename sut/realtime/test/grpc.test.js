const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startGrpc, reflectionClient, metadata, unary, stats, grpc } = require('./helpers');

let sut;
let noReflection;
before(async () => {
  sut = await startGrpc({ reflection: true });
  noReflection = await startGrpc({ reflection: false });
});
after(async () => {
  await sut.close();
  await noReflection.close();
});
beforeEach(() => stats.reset());

test('Unary replies OK with the payload and payload_bytes of filler', async () => {
  const { err, reply } = await unary(sut.client, { payload: 'hi', behaviour: { payload_bytes: 2048, run: 'u' } });
  assert.equal(err, null);
  assert.equal(reply.payload, 'hi');
  assert.equal(reply.filler.length, 2048);
  assert.deepEqual(stats.snapshot('u').grpc.calls, { 'Unary OK': 1 });
});

test('Unary answers with the requested status code and a fixed message', async () => {
  const { err } = await unary(sut.client, { behaviour: { status_code: 14, run: 'u' } });
  assert.equal(err.code, grpc.status.UNAVAILABLE);
  assert.equal(err.details, 'sut: injected UNAVAILABLE');
  const custom = await unary(sut.client, { behaviour: { status_code: 5, status_message: 'nope' } });
  assert.equal(custom.err.code, grpc.status.NOT_FOUND);
  assert.equal(custom.err.details, 'nope');
  assert.deepEqual(stats.snapshot('u').grpc.calls, { 'Unary UNAVAILABLE': 1 });
});

test('delay_ms sets the response-time floor', async () => {
  const { err, elapsed } = await unary(sut.client, { behaviour: { delay_ms: 300 } });
  assert.equal(err, null);
  assert.ok(elapsed >= 295 && elapsed < 600, `elapsed ${elapsed} ms`);
});

test('a delay past the client deadline gives DEADLINE_EXCEEDED and the server records the cancel', async () => {
  const { err } = await unary(sut.client, { behaviour: { delay_ms: 600, run: 'dl' } }, undefined, {
    deadline: Date.now() + 150,
  });
  assert.equal(err.code, grpc.status.DEADLINE_EXCEEDED);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(stats.snapshot('dl').grpc.cancelled, 1);
  assert.deepEqual(stats.snapshot('dl').grpc.calls, { 'Unary cancelled': 1 });
});

test('x-sut-* metadata overrides the request fields', async () => {
  const md = metadata({ 'x-sut-status': 7, 'x-sut-run': 'md' });
  const { err } = await unary(sut.client, { behaviour: { status_code: 0 } }, md);
  assert.equal(err.code, grpc.status.PERMISSION_DENIED);
  assert.deepEqual(stats.snapshot('md').grpc.calls, { 'Unary PERMISSION_DENIED': 1 });
});

test('out-of-range behaviour is INVALID_ARGUMENT', async () => {
  assert.equal((await unary(sut.client, { behaviour: { status_code: 17 } })).err.code, grpc.status.INVALID_ARGUMENT);
  assert.equal((await unary(sut.client, {}, metadata({ 'x-sut-delay-ms': 'abc' }))).err.code, grpc.status.INVALID_ARGUMENT);
});

test('ServerStream sends exactly count messages, then the requested status', async () => {
  const collect = (request) => new Promise((resolve) => {
    const messages = [];
    const call = sut.client.ServerStream(request);
    call.on('data', (m) => messages.push(m.seq));
    call.on('error', (err) => resolve({ messages, err }));
    call.on('end', () => resolve({ messages, err: null }));
  });
  const ok = await collect({ count: 5, behaviour: { run: 's' } });
  assert.deepEqual(ok.messages, [1, 2, 3, 4, 5]);
  assert.equal(ok.err, null);
  const failing = await collect({ count: 2, behaviour: { status_code: 14 } });
  assert.deepEqual(failing.messages, [1, 2]);
  assert.equal(failing.err.code, grpc.status.UNAVAILABLE);
  const g = stats.snapshot('s').grpc;
  assert.equal(g.streamsOpened, 1);
  assert.equal(g.streamMsgsOut, 5);
});

test('ClientStream replies with how many messages arrived', async () => {
  const reply = await new Promise((resolve, reject) => {
    const call = sut.client.ClientStream(metadata({ 'x-sut-run': 'cs' }), (err, r) => (err ? reject(err) : resolve(r)));
    [1, 2, 3, 4].forEach((seq) => call.write({ seq }));
    call.end();
  });
  assert.equal(reply.received, 4);
  assert.equal(stats.snapshot('cs').grpc.streamMsgsIn, 4);
});

test('BidiEcho echoes every message and ends when the client half-closes', async () => {
  const echoed = await new Promise((resolve, reject) => {
    const seen = [];
    const call = sut.client.BidiEcho(metadata({ 'x-sut-run': 'bd' }));
    call.on('data', (m) => seen.push(m.seq));
    call.on('end', () => resolve(seen));
    call.on('error', reject);
    [1, 2, 3].forEach((seq) => call.write({ seq }));
    call.end();
  });
  assert.deepEqual(echoed, [1, 2, 3]);
  const g = stats.snapshot('bd').grpc;
  assert.equal(g.streamMsgsIn, 3);
  assert.equal(g.streamMsgsOut, 3);
});

const listServices = (port, version) => new Promise((resolve) => {
  const call = reflectionClient(port, version).ServerReflectionInfo();
  call.on('data', (r) => resolve({ services: (r.list_services_response?.service || []).map((s) => s.name), err: null }));
  call.on('error', (err) => resolve({ services: null, err }));
  call.write({ list_services: '' });
  call.end();
});

test('server reflection lists sut.v1.LoadSut (v1 and v1alpha); the second listener has none', async () => {
  for (const version of ['v1', 'v1alpha']) {
    const { services, err } = await listServices(sut.port, version);
    assert.equal(err, null);
    assert.ok(services.includes('sut.v1.LoadSut'), `${version}: ${services}`);
  }
  const { err } = await listServices(noReflection.port, 'v1');
  assert.equal(err.code, grpc.status.UNIMPLEMENTED);
});
