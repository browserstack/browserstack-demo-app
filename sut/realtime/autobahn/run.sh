#!/bin/sh
# Autobahn TestSuite (fuzzingclient) against /echo: proves the SUT follows RFC 6455, so a
# wrong WebSocket metric in Load Testing can never be blamed on the server itself.
# 9.* (performance) and 12.*/13.* (permessage-deflate, off by design) are excluded.
# Usage: start the SUT (npm start), then `npm run autobahn`. SUT_HOST defaults to the
# Docker host as seen from the container. Exits non-zero if any case is FAILED, or closes
# UNCLEAN where a clean close is required.
set -eu
cd "$(dirname "$0")"
SUT_HOST="${SUT_HOST:-host.docker.internal}"
# Autobahn tests the SUT's own plaintext listener; TLS is terminated by the load balancer.
# nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
SUT_URL="ws://${SUT_HOST}:8080"
mkdir -p reports config
sed "s|SUT_URL|${SUT_URL}|" fuzzingclient.json > config/fuzzingclient.json
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "$PWD/config:/config" -v "$PWD/reports:/reports" \
  crossbario/autobahn-testsuite \
  wstest -m fuzzingclient -s /config/fuzzingclient.json
node -e '
const r = require("./reports/server/index.json")["bstackdemo-realtime-sut"];
const by = {};
for (const [id, c] of Object.entries(r)) (by[c.behavior] ||= []).push(id);
for (const [k, ids] of Object.entries(by)) console.log(k.padEnd(14), ids.length);
const bad = Object.entries(r).filter(([, c]) => c.behavior === "FAILED" || ["FAILED", "UNCLEAN"].includes(c.behaviorClose));
if (bad.length) { console.error("FAILED or UNCLEAN cases:", bad.map(([id, c]) => `${id} (${c.behavior}/${c.behaviorClose})`).join(", ")); process.exit(1); }
'
