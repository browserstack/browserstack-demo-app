// HTTP + WebSocket listener. Every behaviour is chosen by the client through query
// params (see knobs.js), so each WebSocket metric in a Load Testing run is computable.

const http = require('http');
const { WebSocketServer } = require('ws');
const config = require('./config');
const knobsLib = require('./knobs');
const stats = require('./stats');
const { log, describeAuth } = require('./log');

const STATUS_TEXT = http.STATUS_CODES;

const ENDPOINTS = {
  websocket: {
    '/echo': 'Accepts the upgrade and echoes every frame. Pings get a pong.',
    '/hold?ms=N': 'Closes N ms after the 101 (code from ?code=, default 1000).',
    '/close?code=C': 'Closes with code C right away, or after ?ms=.',
    '/drop': 'Kills the TCP connection with no close frame (1006 / "none"); ?ms= delays it, ?rst=0 sends FIN instead of RST.',
    '/push?n=N': 'Sends N extra messages after the 101 (?pushIntervalMs= spaces them).',
    '/reject?status=S': 'Refuses the upgrade with HTTP S (400-599, default 403).',
  },
  knobs: {
    upgradeDelayMs: 'Wait this long before answering the upgrade (sets the connect-time floor).',
    pongDelayMs: 'Wait this long before answering each ping (sets the ping floor).',
    ms: 'Time after the 101 at which the server closes (or drops).',
    code: 'Close code for that close (1000-1003, 1007-1014, 3000-4999).',
    n: 'Extra messages to push after the 101.',
    pushIntervalMs: 'Gap between pushed messages.',
    echo: 'Set 0 to stop echoing client frames.',
    run: 'Run id the connection is counted under in /stats.',
    headers: 'Every knob also works as an x-sut-* header (x-sut-upgrade-delay-ms, x-sut-ms, x-sut-code, ...), which wins over the query. Use headers to vary a knob while keeping one URL.',
  },
  http: {
    'GET /http/<status>': 'Plain HTTP response with that status (200-599); ?delayMs= delays it.',
    'GET /stats?run=<id>': 'Server-side counts for a run (no run: list of run ids).',
    'POST /reset?run=<id>': 'Clears one run (no run: clears all).',
    'GET /healthz': 'Liveness.',
  },
};

const sendJson = (res, status, body, extraHeaders = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
};

// Writes a plain HTTP response on a socket that asked to upgrade, then closes it.
const refuseUpgrade = (socket, status, message) => {
  if (socket.destroyed) return;
  const body = `${message}\n`;
  socket.end(
    `HTTP/1.1 ${status} ${STATUS_TEXT[status] || 'Error'}\r\n` +
      'Connection: close\r\n' +
      'Content-Type: text/plain\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
  );
};

const stripBase = (pathname, basePath) =>
  basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;

const createWsServer = ({ basePath = process.env.SUT_BASE_PATH || '' } = {}) => {
  const wss = new WebSocketServer({ noServer: true, autoPong: false, perMessageDeflate: false });

  const handleHttp = async (req, res) => {
    const url = new URL(req.url, 'http://sut.local');
    const path = stripBase(url.pathname, basePath);
    const run = url.searchParams.get('run') || undefined;
    const count = (status) => stats.bump(stats.get(run).http, `${path} ${status}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      return res.end();
    }
    if (path === '/' && req.method === 'GET') return sendJson(res, 200, { service: 'bstackdemo realtime SUT', ...ENDPOINTS });
    if (path === '/healthz') return sendJson(res, 200, { status: 'ok' });

    if (path === '/stats' && req.method === 'GET') {
      if (!run) return sendJson(res, 200, { runs: stats.list() });
      const snapshot = stats.snapshot(run);
      return snapshot ? sendJson(res, 200, { run, ...snapshot }) : sendJson(res, 404, { error: `no stats for run "${run}"` });
    }
    if (path === '/reset' && req.method === 'POST') {
      stats.reset(run);
      return sendJson(res, 200, { reset: run || 'all' });
    }

    const httpMatch = /^\/http\/(\d{3})$/.exec(path);
    if (httpMatch && req.method === 'GET') {
      const status = Number(httpMatch[1]);
      if (status < 200 || status > 599) return sendJson(res, 400, { error: 'status must be 200-599' });
      let delayMs;
      try {
        delayMs = knobsLib.readInt(url.searchParams, 'delayMs', { max: config.maxDelayMs }) ?? 0;
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      count(status);
      return sendJson(res, status, { status, message: STATUS_TEXT[status] || '' }, status === 429 ? { 'Retry-After': '1' } : {});
    }

    const preset = path.slice(1);
    if (knobsLib.PRESETS.has(preset)) {
      count(426);
      return sendJson(res, 426, { error: `${path} is a WebSocket endpoint; send an Upgrade request` }, { Upgrade: 'websocket' });
    }
    count(404);
    return sendJson(res, 404, { error: 'not found', see: '/' });
  };

  const handleUpgrade = async (req, socket, head) => {
    const url = new URL(req.url, 'http://sut.local');
    const path = stripBase(url.pathname, basePath);
    const auth = describeAuth(req.headers.authorization);
    const params = knobsLib.withHeaderKnobs(url.searchParams, req.headers);

    let knobs;
    try {
      knobs = knobsLib.parse(path.slice(1), params);
    } catch (err) {
      if (!(err instanceof knobsLib.KnobError)) throw err;
      stats.bump(stats.get(params.get('run')).ws.upgradesRejected, '400');
      log('ws_bad_knob', { path, error: err.message });
      return refuseUpgrade(socket, 400, err.message);
    }
    const runStats = stats.get(knobs?.run || params.get('run'));
    if (!knobs) {
      stats.bump(runStats.ws.upgradesRejected, '404');
      return refuseUpgrade(socket, 404, `unknown WebSocket endpoint ${path}`);
    }
    if (auth) runStats.ws.authHeaders += 1;

    if (knobs.upgradeDelayMs) {
      const aborted = await new Promise((resolve) => {
        const onClose = () => { clearTimeout(timer); resolve(true); };
        const timer = setTimeout(() => { socket.off('close', onClose); resolve(false); }, knobs.upgradeDelayMs);
        socket.once('close', onClose);
      });
      if (aborted) return;
    }

    if (knobs.preset === 'reject') {
      stats.bump(runStats.ws.upgradesRejected, String(knobs.status));
      log('ws_reject', { path, status: knobs.status, run: knobs.run, auth });
      return refuseUpgrade(socket, knobs.status, `upgrade rejected by SUT with ${knobs.status}`);
    }

    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, socket, knobs, runStats, { path, auth }));
  };

  const onConnection = (ws, socket, knobs, runStats, meta) => {
    const openedAt = Date.now();
    const s = runStats.ws;
    const timers = [];
    let msgsIn = 0;
    let msgsOut = 0;
    // When the server starts the close, count the code it sent, not the client's echo.
    let serverCloseCode;

    s.upgradesAccepted += 1;
    s.open += 1;
    s.peakConcurrent = Math.max(s.peakConcurrent, s.open);
    log('ws_open', { path: meta.path, run: knobs.run, auth: meta.auth });

    const send = (data, options) => {
      if (ws.readyState !== ws.OPEN) return;
      ws.send(data, options);
      msgsOut += 1;
      s.msgsOut += 1;
    };

    ws.on('message', (data, isBinary) => {
      msgsIn += 1;
      s.msgsIn += 1;
      if (knobs.echo) send(data, { binary: isBinary });
    });

    ws.on('ping', (data) => {
      s.pingsIn += 1;
      const pong = () => {
        if (ws.readyState !== ws.OPEN) return;
        ws.pong(data);
        s.pongsOut += 1;
      };
      if (knobs.pongDelayMs) timers.push(setTimeout(pong, knobs.pongDelayMs));
      else pong();
    });

    for (let i = 1; i <= knobs.n; i += 1) {
      const push = () => send(`push ${i}/${knobs.n}`);
      if (knobs.pushIntervalMs) timers.push(setTimeout(push, knobs.pushIntervalMs * i));
      else push();
    }

    if (knobs.ms !== undefined) {
      timers.push(
        setTimeout(() => {
          if (knobs.drop) {
            // No close frame: the client sees 1006 (k6) or an I/O reset (JMeter).
            if (knobs.rst && typeof socket.resetAndDestroy === 'function') socket.resetAndDestroy();
            else socket.destroy();
          } else {
            serverCloseCode = knobs.code;
            ws.close(knobs.code, `sut ${knobs.preset}`);
          }
        }, knobs.ms),
      );
    }

    ws.on('close', (receivedCode) => {
      timers.forEach(clearTimeout);
      s.open -= 1;
      const code = receivedCode === 1006 || serverCloseCode === undefined ? receivedCode : serverCloseCode;
      stats.bump(s.closes, String(code));
      log('ws_close', { path: meta.path, run: knobs.run, code, durationMs: Date.now() - openedAt, msgsIn, msgsOut });
    });
    ws.on('error', (err) => log('ws_error', { path: meta.path, run: knobs.run, error: err.message }));
  };

  const server = http.createServer((req, res) => {
    handleHttp(req, res).catch((err) => {
      log('http_error', { error: err.message });
      if (!res.headersSent) sendJson(res, 500, { error: 'internal error' });
    });
  });
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    handleUpgrade(req, socket, head).catch((err) => {
      log('upgrade_error', { error: err.message });
      refuseUpgrade(socket, 500, 'internal error');
    });
  });
  server.wss = wss;
  return server;
};

module.exports = { createWsServer, ENDPOINTS };
