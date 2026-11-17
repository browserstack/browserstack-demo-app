// Parses and validates the WebSocket knobs. Unknown query params are ignored on purpose
// (scripts tag connections with e.g. ?leg=x), but a known knob with a bad value is a
// 400, so a typo in a test script fails loudly instead of skewing a metric.

const config = require('./config');

class KnobError extends Error {}

// Close codes a server may send (RFC 6455 7.4): 1004-1006 and 1015 are reserved.
const SENDABLE_CLOSE_CODE = (code) =>
  (code >= 1000 && code <= 1003) || (code >= 1007 && code <= 1014) || (code >= 3000 && code <= 4999);

const readInt = (params, name, { min = 0, max }) => {
  if (!params.has(name)) return undefined;
  const raw = params.get(name);
  if (!/^\d+$/.test(raw)) throw new KnobError(`${name} must be a whole number, got "${raw}"`);
  const value = Number(raw);
  if (value < min || value > max) throw new KnobError(`${name} must be between ${min} and ${max}, got ${value}`);
  return value;
};

const readBool = (params, name, fallback) => {
  if (!params.has(name)) return fallback;
  const raw = params.get(name);
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  throw new KnobError(`${name} must be 0/1 or true/false, got "${raw}"`);
};

// Paths are presets over the same knobs:
//   /echo                      stay open, echo every frame
//   /hold?ms=N                 close (code, default 1000) N ms after the 101
//   /close?code=C              close with C right away (or after ms)
//   /drop                      kill the TCP connection with no close frame (or after ms)
//   /push?n=N                  send N extra messages after the 101
//   /reject?status=S           refuse the upgrade with HTTP S (default 403)
const PRESETS = new Set(['echo', 'hold', 'close', 'drop', 'push', 'reject']);

// Every knob can also come from an x-sut-* header, which wins over the query string. k6
// tags WebSocket samples with the full URL (query included), so a script that varies a
// knob per iteration should use headers to keep one URL, i.e. one row in the report.
const HEADER_KNOBS = {
  'x-sut-upgrade-delay-ms': 'upgradeDelayMs',
  'x-sut-pong-delay-ms': 'pongDelayMs',
  'x-sut-ms': 'ms',
  'x-sut-code': 'code',
  'x-sut-n': 'n',
  'x-sut-push-interval-ms': 'pushIntervalMs',
  'x-sut-echo': 'echo',
  'x-sut-rst': 'rst',
  'x-sut-drop': 'drop',
  'x-sut-status': 'status',
  'x-sut-run': 'run',
};

const withHeaderKnobs = (query, headers) => {
  const params = new URLSearchParams(query);
  for (const [header, knob] of Object.entries(HEADER_KNOBS)) {
    if (headers[header] !== undefined) params.set(knob, String(headers[header]));
  }
  return params;
};

const parse = (preset, params) => {
  if (!PRESETS.has(preset)) return null;
  const { maxDelayMs, maxCount } = config;

  const knobs = {
    preset,
    run: params.get('run') || undefined,
    upgradeDelayMs: readInt(params, 'upgradeDelayMs', { max: maxDelayMs }) ?? 0,
    pongDelayMs: readInt(params, 'pongDelayMs', { max: maxDelayMs }) ?? 0,
    n: readInt(params, 'n', { max: maxCount }) ?? 0,
    pushIntervalMs: readInt(params, 'pushIntervalMs', { max: maxDelayMs }) ?? 0,
    ms: readInt(params, 'ms', { max: maxDelayMs }),
    code: readInt(params, 'code', { min: 1000, max: 4999 }),
    echo: readBool(params, 'echo', true),
    rst: readBool(params, 'rst', true),
    drop: readBool(params, 'drop', preset === 'drop'),
    status: undefined,
  };

  if (preset === 'reject') {
    knobs.status = readInt(params, 'status', { min: 400, max: 599 }) ?? 403;
    return knobs;
  }
  if (preset === 'hold' && knobs.ms === undefined) throw new KnobError('/hold needs ms=<milliseconds>');
  if (preset === 'push' && !params.has('n')) throw new KnobError('/push needs n=<count>');
  if (preset === 'close') {
    if (knobs.code === undefined) throw new KnobError('/close needs code=<close code>');
    if (knobs.ms === undefined) knobs.ms = 0;
  }
  if (preset === 'drop' && knobs.ms === undefined) knobs.ms = 0;
  if (knobs.code !== undefined && !SENDABLE_CLOSE_CODE(knobs.code)) {
    throw new KnobError(`code ${knobs.code} cannot be sent by a server (use 1000-1003, 1007-1014 or 3000-4999)`);
  }
  if (knobs.code === undefined) knobs.code = 1000;
  return knobs;
};

module.exports = { parse, readInt, withHeaderKnobs, HEADER_KNOBS, KnobError, PRESETS, SENDABLE_CLOSE_CODE };
