// Deterministic WebSocket run against the realtime SUT (sut/realtime).
//
// Every figure Load Testing reports for this run can be computed before it starts. At the end,
// handleSummary prints the value LT should show for each WebSocket metric next to what k6
// measured locally, and teardown prints the SUT's own counts for the run.
//
// Design (k6/ws):
//   failures  1 VU, 15 attempts: 10 upgrades rejected with 503 + 5 connects to a refused port.
//             Runs first, alone, so its tiny spans never overlap the sessions (keeps peak exact).
//   sessions  10 VUs x 10 iterations = 100 sessions, each to /hold: the server answers the upgrade
//             after a fixed delay (table below), pushes 5 messages, closes with 1000 after 2000 ms.
//             The client sends 3 messages (echoed back) and 1 ping (pong after 50 ms).
//   Knobs go in x-sut-* headers, so every session uses one URL = one row in the LT report.
//
// Run locally (SUT on the host):
//   docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/w" -w /w \
//     grafana/k6:2.2.0 run ws-deterministic.js
// Against a deployed SUT: -e SUT_WS=wss://ws.bstackdemo.com

import ws from 'k6/ws';
import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';

// The plaintext default is the local SUT; a deployed run passes SUT_WS=wss://...
// nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
const WS = (__ENV.SUT_WS || 'ws://host.docker.internal:8080').replace(/\/+$/, '');
const HTTP = WS.replace(/^ws/, 'http');

const VUS = 10;
const PER_VU = 10;
const SESSIONS = VUS * PER_VU;
const HOLD_MS = 2000;
const PUSH_N = 5;
const SENT_PER_SESSION = 3;
const PONG_DELAY_MS = 50;
const REJECTS = 10;
const REFUSED = 5;

// Connect delay per session (by iteration number): 70 x 100, 15 x 300, 8 x 600, 4 x 900, 3 x 1500 ms.
// With 100 values, every percentile LT reports lands inside one step of this table.
const delayFor = (i) => (i < 70 ? 100 : i < 85 ? 300 : i < 93 ? 600 : i < 97 ? 900 : 1500);

export const options = {
  scenarios: {
    failures: { executor: 'per-vu-iterations', vus: 1, iterations: REJECTS + REFUSED, exec: 'failures', maxDuration: '30s' },
    sessions: { executor: 'per-vu-iterations', vus: VUS, iterations: PER_VU, exec: 'sessions', startTime: '5s', maxDuration: '2m' },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(75)', 'p(90)', 'p(95)', 'p(99)', 'count'],
  // Submetric thresholds only so k6 tracks the 101-only connect times LT uses.
  thresholds: {
    'ws_connecting{status:101}': ['max<60000'],
    checks: ['rate==1'],
  },
};

// A fresh run id per execution; a fixed RUN is reset first so teardown's counts are this
// execution's only. The reset is an HTTP request, so no WebSocket figure changes.
export function setup() {
  const run = __ENV.RUN || `k6-ws-${Date.now()}`;
  const res = http.post(`${HTTP}/reset?run=${encodeURIComponent(run)}`);
  if (res.status !== 200) throw new Error(`could not reset run ${run} (HTTP ${res.status}); teardown counts would mix executions`);
  return { run };
}

export function failures(data) {
  const i = exec.scenario.iterationInTest;
  if (i < REJECTS) {
    const res = ws.connect(`${WS}/reject?status=503&run=${encodeURIComponent(data.run)}`, null, () => {});
    check(res, { 'reject leg answered 503': (r) => r && r.status === 503 });
    return;
  }
  let res;
  try {
    res = ws.connect('ws://127.0.0.1:1/', null, () => {});
  } catch (e) {
    res = { status: 0 };
  }
  check(res, { 'refused leg has no status': (r) => !r || r.status === 0 });
}

export function sessions(data) {
  const i = exec.scenario.iterationInTest;
  const params = {
    headers: {
      'x-sut-upgrade-delay-ms': String(delayFor(i)),
      'x-sut-ms': String(HOLD_MS),
      'x-sut-n': String(PUSH_N),
      'x-sut-code': '1000',
      'x-sut-pong-delay-ms': String(PONG_DELAY_MS),
      'x-sut-run': data.run,
    },
  };
  let received = 0;
  const res = ws.connect(`${WS}/hold?ms=${HOLD_MS}`, params, (socket) => {
    socket.on('open', () => {
      for (let m = 1; m <= SENT_PER_SESSION; m += 1) socket.send(`msg ${m}`);
      socket.ping();
    });
    socket.on('message', () => { received += 1; });
    // Safety net only: the server closes at HOLD_MS.
    socket.setTimeout(() => socket.close(), HOLD_MS + 5000);
  });
  check(res, { 'session upgraded (101)': (r) => r && r.status === 101 });
  check(received, { 'received 3 echoes + 5 pushes': (n) => n === SENT_PER_SESSION + PUSH_N });
}

export function teardown(data) {
  const res = http.get(`${HTTP}/stats?run=${encodeURIComponent(data.run)}`);
  if (res.status !== 200) {
    console.log(`SUT stats unavailable (${res.status}) for run ${data.run}`);
    return;
  }
  const s = res.json().ws;
  console.log(`SUT counts for run ${data.run}: accepted=${s.upgradesAccepted} rejected=${JSON.stringify(s.upgradesRejected)} ` +
    `msgsIn=${s.msgsIn} msgsOut=${s.msgsOut} pings=${s.pingsIn} closes=${JSON.stringify(s.closes)} peakConcurrent=${s.peakConcurrent}`);
}

// ---- expected values (same formulas as the LT backend, util/webSocketMetrics.js) ----

// ClickHouse quantile / k6 Trend: linear interpolation at level * (n - 1).
const pct = (sorted, level) => {
  const pos = level * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (x) => (x === undefined || x === null || Number.isNaN(x) ? '-' : Number(x).toFixed(2));

const expected = () => {
  const attempts = SESSIONS + REJECTS + REFUSED;
  const errors = REJECTS + REFUSED;
  const connect = Array.from({ length: SESSIONS }, (_, i) => delayFor(i)).sort((a, b) => a - b);
  // k6/ws records a ~0 ms session duration for every failed attempt, and LT keeps those rows.
  const duration = connect.map((d) => d + HOLD_MS).concat(Array(errors).fill(0)).sort((a, b) => a - b);
  return {
    attempts,
    errors,
    errorPct: (errors / attempts) * 100,
    connect: { avg: avg(connect), min: connect[0], max: connect[connect.length - 1], p75: pct(connect, 0.75), p90: pct(connect, 0.9), p95: pct(connect, 0.95), p99: pct(connect, 0.99) },
    duration: { avg: avg(duration), p50: pct(duration, 0.5), p90: pct(duration, 0.9), p95: pct(duration, 0.95), p99: pct(duration, 0.99), max: duration[duration.length - 1] },
    sent: SESSIONS * SENT_PER_SESSION,
    received: SESSIONS * (SENT_PER_SESSION + PUSH_N),
    peak: VUS,
    ping: PONG_DELAY_MS,
  };
};

export function handleSummary(data) {
  const m = data.metrics;
  const v = (name) => (m[name] ? m[name].values : {});
  const e = expected();
  const local = {
    attempts: v('ws_connecting').count,
    ok: v('ws_connecting{status:101}').count,
    sessions: v('ws_sessions').count,
    connect: v('ws_connecting{status:101}'),
    duration: v('ws_session_duration'),
    sent: v('ws_msgs_sent').count,
    received: v('ws_msgs_received').count,
    ping: v('ws_ping').avg,
  };
  const errs = local.attempts - local.ok;
  const rows = [
    ['totalSessions (ws_sessions rows)', e.attempts, local.sessions, 'k6 counts failed attempts too'],
    ['connectionAttempts', e.attempts, local.attempts, ''],
    ['connectionErrors', e.errors, errs, '10 x 503 + 5 refused'],
    ['connectionErrorPercentage', f2(e.errorPct), f2((errs / local.attempts) * 100), 'not rounded in LT'],
    ['connections[] sessions for /hold', SESSIONS, local.ok, 'per URL: 101 rows only'],
    ['connecting.avg (ms)', f2(e.connect.avg), f2(local.connect.avg), 'expected + network time'],
    ['connecting.min (ms)', e.connect.min, f2(local.connect.min), 'expected + network time'],
    ['connecting.p75 (ms)', e.connect.p75, f2(local.connect['p(75)']), 'expected + network time'],
    ['connecting.p90 (ms)', e.connect.p90, f2(local.connect['p(90)']), 'expected + network time'],
    ['connecting.p95 (ms)', e.connect.p95, f2(local.connect['p(95)']), 'expected + network time'],
    ['connecting.p99 (ms)', e.connect.p99, f2(local.connect['p(99)']), 'expected + network time'],
    ['connecting.max (ms)', e.connect.max, f2(local.connect.max), 'expected + network time'],
    ['sessionDuration.avg (ms)', f2(e.duration.avg), f2(local.duration.avg), 'includes connect; failures ~0 ms'],
    ['sessionDuration.p50 (ms)', e.duration.p50, f2(local.duration.med), ''],
    ['sessionDuration.p90 (ms)', e.duration.p90, f2(local.duration['p(90)']), ''],
    ['sessionDuration.p95 (ms)', e.duration.p95, f2(local.duration['p(95)']), ''],
    ['sessionDuration.p99 (ms)', e.duration.p99, f2(local.duration['p(99)']), ''],
    ['messagesSent', e.sent, local.sent, 'exact; k6/ws does not count pings'],
    ['messagesReceived', e.received, local.received, 'exact: 3 echoes + 5 pushes per session'],
    ['messagesSentPerSec', `${e.sent} / (testDuration + 1)`, '-', 'LT divides by the run window'],
    ['messagesReceivedPerSec', `${e.received} / (testDuration + 1)`, '-', ''],
    ['peakConcurrentSessions', e.peak, 'see SUT counts', 'all 10 VUs hold at once'],
    ['avgPingMs', `${e.ping} + network`, f2(local.ping), ''],
    ['statusCodeDistribution', '101:100, 503:10, 0:5', '-', 'refused has no status -> 0'],
  ];
  const w = [36, 26, 16];
  const line = (r) => `${String(r[0]).padEnd(w[0])} ${String(r[1]).padEnd(w[1])} ${String(r[2]).padEnd(w[2])} ${r[3]}`;
  const checks = v('checks');
  const out = [
    '',
    'WebSocket metrics: what Load Testing should report vs what k6 measured here',
    line(['LT field', 'expected in LT', 'k6 local', 'note']),
    line(['-'.repeat(w[0]), '-'.repeat(w[1]), '-'.repeat(w[2]), '-'.repeat(30)]),
    ...rows.map(line),
    '',
    `checks: ${checks.passes ?? 0} passed, ${checks.fails ?? 0} failed`,
    '',
  ].join('\n');
  return { stdout: out, 'ws-deterministic-summary.json': JSON.stringify(data, null, 2) };
}
