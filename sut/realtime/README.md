# Realtime SUT: WebSocket + gRPC

A system under test for BrowserStack Load Testing's WebSocket and gRPC reports. Every behaviour
is chosen by the client (query params, `x-sut-*` headers, request fields or gRPC metadata), so
every metric a k6 or JMeter run reports has a value you can compute before the run.

It is a separate Node service, not a Next.js route: Next API routes cannot hold a WebSocket or
serve gRPC. The `/sut/realtime` page in the app is a browser console for it.

```shell
cd sut/realtime
npm ci
npm start          # ws/http :8080, gRPC :50051 (reflection) and :50052 (none), TCP reset :50099
npm test           # unit tests (node:test)
npm run autobahn   # RFC 6455 conformance against /echo (needs Docker and a running SUT)
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `SUT_WS_PORT` | 8080 | HTTP + WebSocket |
| `SUT_GRPC_PORT` / `SUT_GRPC_NOREFLECT_PORT` | 50051 / 50052 | gRPC with / without server reflection |
| `SUT_RESET_PORT` | 50099 | TCP listener that resets every connection (`0` turns it off) |
| `SUT_GRPC_TLS_CERT` / `SUT_GRPC_TLS_KEY` | – | In-process TLS for gRPC when the load balancer passes TCP through |
| `SUT_BASE_PATH` | – | Path prefix to strip when served under e.g. `/sut/ws` |
| `SUT_LOG` | on | `0` turns off the one-line-per-connection JSON log |

## WebSocket

No auth and no subprotocol are required. Any query string is accepted (e.g. `?leg=x`); an
`Authorization` header is accepted and logged as scheme, length and a short hash, never the value.

| Endpoint | Behaviour |
| --- | --- |
| `/echo` | Accepts the upgrade, echoes every frame, answers pings. |
| `/hold?ms=N` | Closes N ms after the 101 with `code` (default 1000). |
| `/close?code=C` | Closes with C right away, or after `ms`. 1004-1006 and 1015 cannot be sent and are a 400. |
| `/drop` | Kills the TCP connection with no close frame (client sees 1006). `ms` delays it; `rst=0` sends FIN instead of RST. |
| `/push?n=N` | Sends N extra messages (`push i/N`) after the 101; `pushIntervalMs` spaces them. |
| `/reject?status=S` | Refuses the upgrade with HTTP S (400-599, default 403). |

Knobs work on every path and combine, e.g. `/hold?ms=2000&n=5&code=1001&upgradeDelayMs=300`:
`upgradeDelayMs`, `pongDelayMs`, `ms`, `code`, `n`, `pushIntervalMs`, `echo` (0 stops echoing),
`drop`, `rst`, `status`, `run`. Each also works as an `x-sut-*` header
(`x-sut-upgrade-delay-ms`, `x-sut-ms`, `x-sut-code`, …), which wins over the query string.
A malformed knob is a 400 on the upgrade, an unknown path a 404.

HTTP helpers on the same port: `GET /http/<status>` (200-599, `?delayMs=`), `GET /stats?run=<id>`,
`POST /reset?run=<id>`, `GET /healthz`, and `GET /` for this list as JSON.

## gRPC: `sut.v1.LoadSut`

Definitions: [`proto/sut/v1/load_sut.proto`](proto/sut/v1/load_sut.proto), which imports
`sut/v1/common.proto` (upload one without the other to trigger the missing-import warning).

| Method | Behaviour |
| --- | --- |
| `Unary` | Replies after `behaviour.delay_ms` with `behaviour.status_code` (0-16) and `payload_bytes` of filler. |
| `ServerStream` | Sends exactly `count` messages, `interval_ms` apart, then ends with the status. |
| `ClientStream` | Replies with how many messages arrived. |
| `BidiEcho` | Echoes every message; ends when the client half-closes. |

Behaviour can also come from metadata, which wins: `x-sut-delay-ms`, `x-sut-status`,
`x-sut-status-message`, `x-sut-payload-bytes`, `x-sut-run`. Streams take behaviour from metadata
only. A delay past the client deadline gives `DEADLINE_EXCEEDED`; out-of-range values are
`INVALID_ARGUMENT`. Port 50052 has no reflection, so a reflection connect there fails.

## Server-side counts

`GET /stats?run=<id>` returns what the server saw for connections and calls tagged with that run
id: upgrades accepted / rejected by status, messages in / out, pings, close codes (the code the
server sent when it started the close), peak concurrent sessions, gRPC calls by method and
status, cancels, and stream counters. Compare them with the Load Testing report for the same run.
Counts are per process, so run one replica (or sum across replicas).

## Deterministic k6 scripts

[`examples/k6/ws-deterministic.js`](examples/k6/ws-deterministic.js) and
[`examples/k6/grpc-deterministic.js`](examples/k6/grpc-deterministic.js) drive every WebSocket /
gRPC metric to a value computed from the script's own constants, and print the value Load Testing
should report next to what k6 measured, plus the SUT's `/stats` counts for the run.

```shell
cd sut/realtime   # SUT running on the host
docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/w" -w /w \
  grafana/k6:2.2.0 run examples/k6/ws-deterministic.js
```

Against a deployed SUT pass `-e SUT_WS=wss://ws.bstackdemo.com` (WebSocket) or the `SUT_GRPC*`
variables documented at the top of the gRPC script.

## Notes for test authors (calibrated on k6 v2.2.0 and JMeter 5.6.3, 2026-11-16)

These are engine behaviours, not SUT behaviours, but every expected value depends on them.

**k6 WebSocket (`k6/ws` and `k6/websockets`)**
- `ws_sessions` and `ws_connecting` are emitted for **every attempt**, including rejected,
  refused and reset ones. A rejected upgrade carries its HTTP status (`403`); a refused or reset
  connection carries no status tag.
- `ws_session_duration` **includes the connect time** (≈ `upgradeDelayMs + ms`).
- `k6/ws` also emits `ws_session_duration` (≈ 0-3 ms) for failed attempts; `k6/websockets` does not.
- `k6/ws` stamps a session at open; `k6/websockets` stamps it at close.
- `ws_msgs_sent`: `k6/ws` counts data frames only; `k6/websockets` also counts each ping and a
  client-initiated close frame. Pongs are never counted as received.
- `ws_ping` ≈ `pongDelayMs` + network round trip.
- The `url` tag is the full URL including the query string, and a custom `url` tag does not
  replace it. Vary knobs with `x-sut-*` headers to keep one URL per report row.

**JMeter WebSocket (Peter Doornbosch samplers 1.3.2)**
- The `Connect` column includes the whole upgrade (≈ `upgradeDelayMs`). Use `upgradeDelayMs ≥ 1`
  so it is never 0.
- Rejected upgrade: code `403`, message `Got unexpected status 403 …`. Refused port:
  `WebSocket I/O error: Connection refused`. Reset port: `WebSocket I/O error: Connection reset`,
  which reads as a mid-session drop, not a connection error. Use a refused port for the
  connection-error leg.
- A server-initiated close is only recorded with its code by a **Close sampler** that runs after
  the server closed (it reports the server's code, e.g. 1001). A Read sampler that receives the
  close frame reports `Sampler error: unexpected frame type (close)` instead.
- Write rows: `200` with sent bytes; Read rows: `200` with bytes; a Ping/Pong sampler has both.

**k6 gRPC (`k6/net/grpc`)**
- Every unary call and every stream emits one `grpc_req_duration` (a stream's covers its whole
  life). `grpc_streams` is 1 per stream; a ServerStream's request counts as one sent message.
- Stock k6 emits nothing for a call that hits its deadline (Load Testing patches this), and
  nothing for an unreachable target (the connect throws).
- `reflect: true` against a server without reflection emits three status-12 samples with no
  method or name tags; against a server with reflection it emits none.

**JMeter gRPC (`jmeter-grpc-request` 2.0.2)**
- OK: code `200`, message ` success`. Error: code ` 500`, message ` <code> <NAME>`. URL is `null`.
- Once a sampler gets a non-OK status, **later runs of that same sampler on that thread fail
  immediately with `14 UNAVAILABLE` ("Channel shutdown invoked") without reaching the server**.
  Other samplers are unaffected. Plan error legs with that in mind.
