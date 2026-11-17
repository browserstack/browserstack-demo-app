// Deterministic gRPC run against the realtime SUT (sut/realtime), using k6/net/grpc.
//
// Every figure Load Testing reports for this run can be computed before it starts. At the end,
// handleSummary prints the value LT should show next to what k6 measured locally, and teardown
// prints the SUT's own counts for the run.
//
// Design:
//   latency   10 VUs x 10 Unary calls = 100 calls, each answered after a fixed delay (table below).
//             These are the only calls in the "/sut.v1.LoadSut/Unary" row, so its percentiles are exact.
//   errors    8 Unary calls tagged name "Unary errors": 5 x UNAVAILABLE (14), 3 x NOT_FOUND (5).
//   deadline  3 Unary calls tagged "Unary deadline": the server waits 1000 ms, the client gives up
//             at 300 ms -> DEADLINE_EXCEEDED (4). LT's patched k6 records them; stock k6 does not.
//   streams   2 iterations of ServerStream (5 messages, 100 ms apart), ClientStream (4 sent) and
//             BidiEcho (3 sent, 3 echoed).
//   reflect   1 reflection connect to the no-reflection listener -> 3 calls with status 12
//             (__grpc_reflection_connect__ in LT). Skipped when SUT_GRPC_NOREFLECT is empty.
// The leg sizes keep every run-wide percentile inside one step of the delay table (n = 120 rows,
// and still with no deadline rows or no reflection leg), so one row more or less cannot flip it.
//
// Run locally from sut/realtime (SUT on the host):
//   docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/w" -w /w \
//     grafana/k6:2.2.0 run examples/k6/grpc-deterministic.js
// Against a deployed SUT: -e SUT_GRPC=grpc.bstackdemo.com:443 -e SUT_GRPC_PLAINTEXT=false
//   -e SUT_GRPC_NOREFLECT=<host:port> -e SUT_HTTP=https://ws.bstackdemo.com

import grpc from 'k6/net/grpc';
import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';

const ADDR = __ENV.SUT_GRPC || 'host.docker.internal:50051';
const NOREFLECT = __ENV.SUT_GRPC_NOREFLECT ?? 'host.docker.internal:50052';
const PLAINTEXT = (__ENV.SUT_GRPC_PLAINTEXT || 'true') === 'true';
const HTTP = (__ENV.SUT_HTTP || 'http://host.docker.internal:8080').replace(/\/+$/, '');
const RUN = __ENV.RUN || 'k6-grpc';

const UNARY = 'sut.v1.LoadSut/Unary';
const VUS = 10;
const PER_VU = 10;
const LATENCY_CALLS = VUS * PER_VU;
const ERRORS = [...Array(5).fill(14), ...Array(3).fill(5)];
const DEADLINE_CALLS = 3;
const DEADLINE_TIMEOUT_MS = 300;
const DEADLINE_DELAY_MS = 1000;
const STREAM_ITERATIONS = 2;
const SS_COUNT = 5;
const SS_INTERVAL_MS = 100;
const CS_SENT = 4;
const BIDI_SENT = 3;
const REFLECT_ROWS = NOREFLECT ? 3 : 0;

// Response delay per latency call: 70 x 100, 15 x 300, 8 x 600, 4 x 900, 3 x 1500 ms.
const delayFor = (i) => (i < 70 ? 100 : i < 85 ? 300 : i < 93 ? 600 : i < 97 ? 900 : 1500);

const client = new grpc.Client();
client.load(['../../proto'], 'sut/v1/load_sut.proto');

const md = { 'x-sut-run': RUN };
const connect = () => {
  if (exec.vu.iterationInScenario === 0) client.connect(ADDR, { plaintext: PLAINTEXT });
};

const scenarios = {
  latency: { executor: 'per-vu-iterations', vus: VUS, iterations: PER_VU, exec: 'latency', maxDuration: '2m' },
  errors: { executor: 'per-vu-iterations', vus: 1, iterations: ERRORS.length, exec: 'errors', maxDuration: '1m' },
  deadline: { executor: 'per-vu-iterations', vus: 1, iterations: DEADLINE_CALLS, exec: 'deadline', maxDuration: '1m' },
  streams: { executor: 'per-vu-iterations', vus: 1, iterations: STREAM_ITERATIONS, exec: 'streams', maxDuration: '1m' },
};
if (NOREFLECT) scenarios.reflect = { executor: 'per-vu-iterations', vus: 1, iterations: 1, exec: 'reflect', maxDuration: '30s' };

export const options = {
  scenarios,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(75)', 'p(90)', 'p(95)', 'p(99)', 'count'],
  // Submetric threshold only so k6 tracks the Unary row on its own.
  thresholds: {
    [`grpc_req_duration{name:/${UNARY}}`]: ['max<60000'],
    checks: ['rate==1'],
  },
};

export function latency() {
  connect();
  const i = exec.scenario.iterationInTest;
  const res = client.invoke(UNARY, { behaviour: { delay_ms: delayFor(i) } }, { metadata: md });
  check(res, { 'latency call OK': (r) => r && r.status === grpc.StatusOK });
}

export function errors() {
  connect();
  const code = ERRORS[exec.scenario.iterationInTest];
  const res = client.invoke(UNARY, { behaviour: { status_code: code } }, { metadata: md, tags: { name: 'Unary errors' } });
  // k6 exposes the status as a wrapped Go value, so compare it as a number.
  check(res, { 'error call has the injected status': (r) => r && Number(r.status) === code });
}

export function deadline() {
  connect();
  const res = client.invoke(UNARY, { behaviour: { delay_ms: DEADLINE_DELAY_MS } }, {
    metadata: md, timeout: `${DEADLINE_TIMEOUT_MS}ms`, tags: { name: 'Unary deadline' },
  });
  check(res, { 'deadline call is DEADLINE_EXCEEDED': (r) => r && r.status === grpc.StatusDeadlineExceeded });
}

export function streams() {
  connect();
  let ssGot = 0;
  const ss = new grpc.Stream(client, 'sut.v1.LoadSut/ServerStream', { metadata: md });
  ss.on('data', () => { ssGot += 1; });
  ss.on('end', () => check(ssGot, { 'ServerStream got every message': (n) => n === SS_COUNT }));
  ss.write({ count: SS_COUNT, interval_ms: SS_INTERVAL_MS });
  ss.end();

  const cs = new grpc.Stream(client, 'sut.v1.LoadSut/ClientStream', { metadata: md });
  cs.on('data', (reply) => check(reply, { 'ClientStream server counted every message': (r) => r.received === CS_SENT }));
  for (let s = 1; s <= CS_SENT; s += 1) cs.write({ seq: s });
  cs.end();

  let echoed = 0;
  const bidi = new grpc.Stream(client, 'sut.v1.LoadSut/BidiEcho', { metadata: md });
  bidi.on('data', () => { echoed += 1; });
  bidi.on('end', () => check(echoed, { 'BidiEcho echoed every message': (n) => n === BIDI_SENT }));
  for (let s = 1; s <= BIDI_SENT; s += 1) bidi.write({ seq: s });
  bidi.end();
}

export function reflect() {
  const c = new grpc.Client();
  let failed = false;
  try {
    c.connect(NOREFLECT, { plaintext: PLAINTEXT, reflect: true });
  } catch (e) {
    failed = true;
  }
  check(failed, { 'reflection connect fails without reflection': (f) => f === true });
}

export function teardown() {
  const res = http.get(`${HTTP}/stats?run=${RUN}`);
  if (res.status !== 200) {
    console.log(`SUT stats unavailable (${res.status}) for run ${RUN}`);
    return;
  }
  const g = res.json().grpc;
  console.log(`SUT counts for run ${RUN}: calls=${JSON.stringify(g.calls)} cancelled=${g.cancelled} ` +
    `streamsOpened=${g.streamsOpened} streamMsgsIn=${g.streamMsgsIn} streamMsgsOut=${g.streamMsgsOut}`);
}

// ---- expected values (same formulas as the LT backend, service/grpcSummaryService.js) ----

// LT's finished-run blob uses ClickHouse quantilesExact: the value at index floor(level * n).
const exact = (sorted, level) => sorted[Math.min(sorted.length - 1, Math.floor(level * sorted.length))];
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (x) => (x === undefined || x === null || Number.isNaN(x) ? '-' : Number(x).toFixed(2));

const expected = () => {
  const unary = Array.from({ length: LATENCY_CALLS }, (_, i) => delayFor(i)).sort((a, b) => a - b);
  const streamRows = STREAM_ITERATIONS * 3;
  // Run-wide response times: fast calls (errors, client/bidi streams, reflection) count as ~0 ms,
  // deadline calls as the client timeout, a server stream as its message spacing.
  const all = [
    ...unary,
    ...Array(ERRORS.length).fill(0),
    ...Array(DEADLINE_CALLS).fill(DEADLINE_TIMEOUT_MS),
    ...Array(STREAM_ITERATIONS).fill((SS_COUNT - 1) * SS_INTERVAL_MS),
    ...Array(STREAM_ITERATIONS * 2).fill(0),
    ...Array(REFLECT_ROWS).fill(0),
  ].sort((a, b) => a - b);
  const total = all.length;
  const errorCount = ERRORS.length + DEADLINE_CALLS + REFLECT_ROWS;
  const dist = { 0: LATENCY_CALLS + streamRows };
  ERRORS.forEach((c) => { dist[c] = (dist[c] || 0) + 1; });
  dist[4] = DEADLINE_CALLS;
  if (REFLECT_ROWS) dist[12] = REFLECT_ROWS;
  const top = Object.entries(dist).filter(([c]) => c !== '0').sort((a, b) => b[1] - a[1])[0][0];
  return {
    total,
    errorCount,
    errorPct: Math.round((errorCount / total) * 10000) / 100,
    dist,
    top,
    unary: { avg: avg(unary), min: unary[0], max: unary[unary.length - 1], p75: exact(unary, 0.75), p90: exact(unary, 0.9), p95: exact(unary, 0.95), p99: exact(unary, 0.99) },
    run: { p75: exact(all, 0.75), p90: exact(all, 0.9), p95: exact(all, 0.95), p99: exact(all, 0.99), max: all[all.length - 1] },
    streams: { opened: streamRows, sent: STREAM_ITERATIONS * (1 + CS_SENT + BIDI_SENT), received: STREAM_ITERATIONS * (SS_COUNT + 1 + BIDI_SENT) },
  };
};

export function handleSummary(data) {
  const m = data.metrics;
  const v = (name) => (m[name] ? m[name].values : {});
  const e = expected();
  const unary = v(`grpc_req_duration{name:/${UNARY}}`);
  const all = v('grpc_req_duration');
  const localTotal = all.count;
  const stockTotal = e.total - DEADLINE_CALLS;
  const rows = [
    ['totalCalls', e.total, localTotal, `stock k6 records no deadline calls: expect ${stockTotal} here`],
    ['errorCount', e.errorCount, '-', `${ERRORS.length} injected + ${DEADLINE_CALLS} deadline + ${REFLECT_ROWS} reflection`],
    ['errorPercentage', f2(e.errorPct), '-', 'rounded to 2 dp'],
    ['statusDistribution', JSON.stringify(e.dist), '-', ''],
    ['topStatus', e.top, '-', 'most frequent non-0 code'],
    [`Unary row calls`, LATENCY_CALLS, unary.count, ''],
    ['Unary row avg (ms)', f2(e.unary.avg), f2(unary.avg), 'expected + network time'],
    ['Unary row min (ms)', e.unary.min, f2(unary.min), 'expected + network time'],
    ['Unary row p75 (ms)', e.unary.p75, f2(unary['p(75)']), 'expected + network time'],
    ['Unary row p90 (ms)', e.unary.p90, f2(unary['p(90)']), 'expected + network time'],
    ['Unary row p95 (ms)', e.unary.p95, f2(unary['p(95)']), 'expected + network time'],
    ['Unary row p99 (ms)', e.unary.p99, f2(unary['p(99)']), 'expected + network time'],
    ['Unary row max (ms)', e.unary.max, f2(unary.max), 'expected + network time'],
    ['run-wide p75 / p90 (ms)', `${e.run.p75} / ${e.run.p90}`, `${f2(all['p(75)'])} / ${f2(all['p(90)'])}`, 'k6 local lacks deadline rows'],
    ['run-wide p95 / p99 (ms)', `${e.run.p95} / ${e.run.p99}`, `${f2(all['p(95)'])} / ${f2(all['p(99)'])}`, 'k6 local lacks deadline rows'],
    ['streams.opened', e.streams.opened, v('grpc_streams').count, 'exact'],
    ['streams.msgsSent', e.streams.sent, v('grpc_streams_msgs_sent').count, 'exact: SS request counts as 1'],
    ['streams.msgsReceived', e.streams.received, v('grpc_streams_msgs_received').count, 'exact: CS reply counts as 1'],
    ['avgCallRate', 'totalCalls / first-to-last span', '-', 'assert a range only'],
  ];
  const w = [26, 34, 18];
  const line = (r) => `${String(r[0]).padEnd(w[0])} ${String(r[1]).padEnd(w[1])} ${String(r[2]).padEnd(w[2])} ${r[3]}`;
  const checks = v('checks');
  const out = [
    '',
    'gRPC metrics: what Load Testing should report vs what k6 measured here',
    line(['LT field', 'expected in LT', 'k6 local', 'note']),
    line(['-'.repeat(w[0]), '-'.repeat(w[1]), '-'.repeat(w[2]), '-'.repeat(30)]),
    ...rows.map(line),
    '',
    `checks: ${checks.passes ?? 0} passed, ${checks.fails ?? 0} failed`,
    '',
  ].join('\n');
  return { stdout: out, 'grpc-deterministic-summary.json': JSON.stringify(data, null, 2) };
}
