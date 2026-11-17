// Deterministic GraphQL run against the realtime SUT (sut/realtime), using k6/http.
//
// Every GraphQL figure Load Testing reports for this run can be computed before it starts. At
// the end, handleSummary prints the value LT should show next to what k6 measured locally, and
// teardown prints the SUT's own counts for the run.
//
// Rules this design follows (load-testing-backend LTS-5689, Nov 2026):
//   - LT labels a row from the request body: the operationName, else "Anonymous query".
//   - Error % counts only HTTP status outside 200-399. GraphQL errors (HTTP 200 + `errors`, partial
//     data included) are counted separately, from a response check that looks at the first 20
//     responses per operation per VU, then 1 in 4. Every VU here makes 10 calls per operation or
//     fewer, and every body is under 2 KB, so every response is checked.
//   - Per-operation percentiles are TDigest (approximate), so each operation has one fixed delay:
//     every percentile of its row is that delay plus network time.
//
// Run locally from sut/realtime (SUT on the host):
//   docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/w" -w /w \
//     grafana/k6:2.2.0 run examples/k6/graphql-deterministic.js
// Against a deployed SUT: -e SUT_HTTP=https://ws.bstackdemo.com
// Run exact designs on one load generator (one region, one pod): the check sampling is per VU.

import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';

const HTTP = (__ENV.SUT_HTTP || 'http://host.docker.internal:8080').replace(/\/+$/, '');
const URL = `${HTTP}/graphql`;
const RUN = __ENV.RUN || 'k6-graphql';

// One entry per operation (= one row in LT). kind: ok | gqlError | partial | http
const OPERATIONS = [
  { op: 'GetItem', type: 'query', vus: 5, perVu: 10, delayMs: 200, kind: 'ok', query: 'query GetItem { delay(ms: 200) { ms } }' },
  { op: 'SlowReport', type: 'query', vus: 2, perVu: 10, delayMs: 800, kind: 'ok', query: 'query SlowReport { delay(ms: 800) { ms } }' },
  { op: 'CreateItem', type: 'mutation', vus: 2, perVu: 10, delayMs: 100, kind: 'ok', query: 'mutation CreateItem { createItem(name: "x", delayMs: 100) { id } }' },
  { op: 'Anonymous query', type: 'query', vus: 1, perVu: 10, delayMs: 0, kind: 'ok', query: '{ echo(message: "anon") }', anonymous: true },
  { op: 'Broken', type: 'query', vus: 1, perVu: 10, delayMs: 0, kind: 'gqlError', code: 'DOWNSTREAM', query: 'query Broken { fail(code: "DOWNSTREAM") }' },
  { op: 'Mixed', type: 'query', vus: 1, perVu: 5, delayMs: 0, kind: 'partial', code: 'SUT_INJECTED', query: 'query Mixed { echo(message: "x") fail }' },
  { op: 'Unavailable', type: 'query', vus: 1, perVu: 5, delayMs: 0, kind: 'http', status: 503, code: 'HTTP_503', query: 'query Unavailable { echo(message: "x") }' },
  { op: 'ViaGet', type: 'query', vus: 1, perVu: 5, delayMs: 0, kind: 'ok', query: 'query ViaGet { echo(message: "get") }', get: true },
];

const scenarioName = (o) => o.op.replace(/\W+/g, '_');

export const options = {
  scenarios: Object.fromEntries(OPERATIONS.map((o, i) => [scenarioName(o), {
    executor: 'per-vu-iterations', vus: o.vus, iterations: o.perVu, exec: 'call', env: { OP_INDEX: String(i) }, maxDuration: '2m',
  }])),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(75)', 'p(90)', 'p(95)', 'p(99)', 'count'],
  // Submetric thresholds only so k6 tracks each operation on its own (the `op` tag is local-only).
  thresholds: {
    ...Object.fromEntries(OPERATIONS.map((o) => [`http_req_duration{op:${o.op}}`, ['max<60000']])),
    checks: ['rate==1'],
  },
};

export function call() {
  const o = OPERATIONS[Number(__ENV.OP_INDEX)];
  const headers = { 'x-sut-run': RUN };
  if (o.status) headers['x-sut-status'] = String(o.status);
  const params = { headers, tags: { op: o.op } };
  let res;
  if (o.get) {
    res = http.get(`${URL}?query=${encodeURIComponent(o.query)}&operationName=${o.op}`, params);
  } else {
    headers['Content-Type'] = 'application/json';
    const body = o.anonymous ? { query: o.query } : { query: o.query, operationName: o.op };
    res = http.post(URL, JSON.stringify(body), params);
  }
  const json = res.json();
  const code = json && json.errors && json.errors.length ? json.errors[0].extensions?.code : null;
  if (o.kind === 'ok') check(res, { [`${o.op}: 200 with data, no errors`]: (r) => r.status === 200 && json.data && !json.errors });
  if (o.kind === 'gqlError' || o.kind === 'partial') {
    check(res, { [`${o.op}: 200 with GraphQL error ${o.code}`]: (r) => r.status === 200 && code === o.code });
  }
  if (o.kind === 'http') check(res, { [`${o.op}: HTTP ${o.status} with error ${o.code}`]: (r) => r.status === o.status && code === o.code });
  check(res, { 'response body under 2 KB (always checked by LT)': (r) => r.body.length <= 2048 });
}

export function teardown() {
  const res = http.get(`${HTTP}/stats?run=${RUN}`);
  if (res.status !== 200) {
    console.log(`SUT stats unavailable (${res.status}) for run ${RUN}`);
    return;
  }
  const g = res.json().graphql;
  console.log(`SUT counts for run ${RUN}: operations=${JSON.stringify(g.operations)} graphqlErrors=${g.graphqlErrors} httpStatus=${JSON.stringify(g.httpStatus)}`);
}

// ---- expected values (load-testing-backend LTS-5689-combined formulas) ----

const expected = () => {
  const calls = (o) => o.vus * o.perVu;
  const sum = (pred) => OPERATIONS.filter(pred).reduce((n, o) => n + calls(o), 0);
  const requests = sum(() => true);
  const httpErrors = sum((o) => o.kind === 'http');
  const gqlOnOk = sum((o) => o.kind === 'gqlError' || o.kind === 'partial');
  const gqlErrors = gqlOnOk + httpErrors; // a 503 with an `errors` body is checked and counted too
  const codes = {};
  OPERATIONS.filter((o) => o.code).forEach((o) => { codes[o.code] = (codes[o.code] || 0) + calls(o); });
  const byType = {};
  OPERATIONS.forEach((o) => { byType[o.type] = (byType[o.type] || 0) + 1; });
  const pct = (n, d) => Math.round((n / d) * 10000) / 100;
  return {
    requests,
    errorPct: pct(httpErrors, requests),
    checked: requests,
    gqlErrors,
    gqlErrorPct: pct(gqlErrors, requests),
    outcome: { clean: requests - gqlOnOk - httpErrors, graphqlErrors: gqlOnOk, httpErrors, unchecked: 0 },
    totalErrorPct: pct(httpErrors + gqlOnOk, requests),
    operationCount: OPERATIONS.length,
    byType,
    codes,
  };
};

export function handleSummary(data) {
  const m = data.metrics;
  const v = (name) => (m[name] ? m[name].values : {});
  const e = expected();
  const f2 = (x) => (x === undefined || x === null || Number.isNaN(x) ? '-' : Number(x).toFixed(2));
  const totalLocal = v('http_reqs').count;
  const failedLocal = Math.round((v('http_req_failed').rate || 0) * totalLocal);
  // teardown's GET /stats is one more request: LT records it as a plain HTTP row (no "graphql" in
  // the path), so summary-wide counts are GraphQL requests + 1.
  const all = e.requests + 1;
  const rows = [
    ['GraphQL requests (graphqlRequestCount)', e.requests, totalLocal - 1, 'exact'],
    ['summary requestCount (all requests)', all, totalLocal, '+1 = teardown GET /stats (HTTP row)'],
    ['summary httpErrorPct (HTTP only)', f2((e.outcome.httpErrors / all) * 100), f2((failedLocal / totalLocal) * 100), 'GraphQL errors never count here'],
    ['errorPercentage, GraphQL rows only', e.errorPct, '-', 'only the Unavailable row has errors (100%)'],
    ['graphqlCheckedCount', e.checked, '-', 'every response checked (<= 20 per op per VU, < 2 KB)'],
    ['graphqlErrorCount', e.gqlErrors, '-', 'GraphQL errors on 200 + the 503 error bodies'],
    ['graphqlErrorPct', e.gqlErrorPct, '-', 'errors / checked'],
    ['outcome clean/graphqlErrors/httpErrors/unchecked', `${e.outcome.clean}/${e.outcome.graphqlErrors}/${e.outcome.httpErrors}/${e.outcome.unchecked}`, '-', 'partial data is an error'],
    ['totalErrorPct', e.totalErrorPct, '-', '(httpErrors + outcome.graphqlErrors) / requests'],
    ['operationCount', e.operationCount, '-', 'one row per operation name'],
    ['summary byType', JSON.stringify(e.byType), '-', 'distinct operation names per type'],
    ['Errors tab byGqlCode', JSON.stringify(e.codes), '-', 'from errors[0].extensions.code'],
    ...OPERATIONS.map((o) => {
      const d = v(`http_req_duration{op:${o.op}}`);
      return [`row "${o.op}" count / avg`, `${o.vus * o.perVu} / ${o.delayMs} + network`, `${d.count} / ${f2(d.avg)}`, 'every percentile = the delay'];
    }),
    ['requestRate / avgRequestRate', 'requests / window', '-', 'denominator differs per surface: range only'],
  ];
  const w = [48, 34, 18];
  const line = (r) => `${String(r[0]).padEnd(w[0])} ${String(r[1]).padEnd(w[1])} ${String(r[2]).padEnd(w[2])} ${r[3]}`;
  const checks = v('checks');
  const out = [
    '',
    'GraphQL metrics: what Load Testing should report vs what k6 measured here',
    line(['LT field', 'expected in LT', 'k6 local', 'note']),
    line(['-'.repeat(w[0]), '-'.repeat(w[1]), '-'.repeat(w[2]), '-'.repeat(30)]),
    ...rows.map(line),
    '',
    `checks: ${checks.passes ?? 0} passed, ${checks.fails ?? 0} failed`,
    '',
  ].join('\n');
  return { stdout: out, 'graphql-deterministic-summary.json': JSON.stringify(data, null, 2) };
}
