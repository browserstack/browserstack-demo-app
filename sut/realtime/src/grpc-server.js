// gRPC listener for sut.v1.LoadSut. Each call does exactly what its Behaviour (request
// field or x-sut-* metadata) asks, so every gRPC metric in a Load Testing run is computable.

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { ReflectionService } = require('@grpc/reflection');
const config = require('./config');
const stats = require('./stats');
const { log } = require('./log');

const PROTO_ROOT = path.join(__dirname, '..', 'proto');
const PROTO_FILE = 'sut/v1/load_sut.proto';

const STATUS_NAME = Object.fromEntries(Object.entries(grpc.status).map(([name, code]) => [code, name]));

const loadDefinition = () =>
  protoLoader.loadSync(PROTO_FILE, { includeDirs: [PROTO_ROOT], keepCase: true, longs: String, defaults: true });

class BehaviourError extends Error {}

const boundedInt = (name, raw, max) => {
  if (raw === undefined || raw === null || raw === '') return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new BehaviourError(`${name} must be a whole number between 0 and ${max}, got "${raw}"`);
  }
  return value;
};

// Request fields first, x-sut-* metadata on top (metadata wins).
const resolveBehaviour = (fromRequest = {}, metadata) => {
  const md = (key) => {
    const values = metadata.get(key);
    return values.length ? String(values[0]) : undefined;
  };
  const pick = (mdKey, field) => md(mdKey) ?? fromRequest[field];
  return {
    delayMs: boundedInt('delay_ms', pick('x-sut-delay-ms', 'delay_ms'), config.maxDelayMs),
    statusCode: boundedInt('status_code', pick('x-sut-status', 'status_code'), 16),
    statusMessage: pick('x-sut-status-message', 'status_message') || '',
    payloadBytes: boundedInt('payload_bytes', pick('x-sut-payload-bytes', 'payload_bytes'), config.maxPayloadBytes),
    run: pick('x-sut-run', 'run') || undefined,
  };
};

const statusError = (b) => ({
  code: b.statusCode,
  details: b.statusMessage || `sut: injected ${STATUS_NAME[b.statusCode]}`,
});

// Resolves after delayMs, or with false as soon as the client cancels (e.g. deadline hit).
const waitUnlessCancelled = (call, delayMs) =>
  new Promise((resolve) => {
    if (call.cancelled) return resolve(false);
    if (!delayMs) return resolve(true);
    const onCancel = () => { clearTimeout(timer); resolve(false); };
    const timer = setTimeout(() => { call.off('cancelled', onCancel); resolve(true); }, delayMs);
    call.once('cancelled', onCancel);
  });

const record = (b, method, outcome) => {
  const g = stats.get(b.run).grpc;
  if (outcome === 'cancelled') g.cancelled += 1;
  stats.bump(g.calls, `${method} ${outcome}`);
  if (outcome !== 'OK') log('grpc_call', { method, outcome, run: b.run });
};

const invalid = (method, err, done) => {
  stats.bump(stats.get().grpc.calls, `${method} INVALID_ARGUMENT`);
  log('grpc_bad_behaviour', { method, error: err.message });
  done({ code: grpc.status.INVALID_ARGUMENT, details: err.message });
};

const handlers = {
  async Unary(call, callback) {
    let b;
    try {
      b = resolveBehaviour(call.request.behaviour || {}, call.metadata);
    } catch (err) {
      if (err instanceof BehaviourError) return invalid('Unary', err, callback);
      throw err;
    }
    if (!(await waitUnlessCancelled(call, b.delayMs))) return record(b, 'Unary', 'cancelled');
    if (b.statusCode !== grpc.status.OK) {
      record(b, 'Unary', STATUS_NAME[b.statusCode]);
      return callback(statusError(b));
    }
    record(b, 'Unary', 'OK');
    return callback(null, {
      payload: call.request.payload,
      filler: Buffer.alloc(b.payloadBytes),
      server_time_ms: String(Date.now()),
    });
  },

  async ServerStream(call) {
    let b;
    let count;
    let intervalMs;
    try {
      b = resolveBehaviour(call.request.behaviour || {}, call.metadata);
      count = boundedInt('count', call.request.count, config.maxCount);
      intervalMs = boundedInt('interval_ms', call.request.interval_ms, config.maxDelayMs);
    } catch (err) {
      if (err instanceof BehaviourError) return invalid('ServerStream', err, (e) => call.emit('error', e));
      throw err;
    }
    const g = stats.get(b.run).grpc;
    g.streamsOpened += 1;
    if (!(await waitUnlessCancelled(call, b.delayMs))) return record(b, 'ServerStream', 'cancelled');
    for (let seq = 1; seq <= count; seq += 1) {
      if (seq > 1 && !(await waitUnlessCancelled(call, intervalMs))) return record(b, 'ServerStream', 'cancelled');
      call.write({ seq, payload: `push ${seq}/${count}` });
      g.streamMsgsOut += 1;
    }
    if (b.statusCode !== grpc.status.OK) {
      record(b, 'ServerStream', STATUS_NAME[b.statusCode]);
      return call.emit('error', statusError(b));
    }
    record(b, 'ServerStream', 'OK');
    return call.end();
  },

  ClientStream(call, callback) {
    let b;
    try {
      b = resolveBehaviour({}, call.metadata);
    } catch (err) {
      if (err instanceof BehaviourError) return invalid('ClientStream', err, callback);
      throw err;
    }
    const g = stats.get(b.run).grpc;
    g.streamsOpened += 1;
    let received = 0;
    call.on('data', () => {
      received += 1;
      g.streamMsgsIn += 1;
    });
    call.on('end', async () => {
      if (!(await waitUnlessCancelled(call, b.delayMs))) return record(b, 'ClientStream', 'cancelled');
      if (b.statusCode !== grpc.status.OK) {
        record(b, 'ClientStream', STATUS_NAME[b.statusCode]);
        return callback(statusError(b));
      }
      record(b, 'ClientStream', 'OK');
      return callback(null, { received });
    });
    return undefined;
  },

  BidiEcho(call) {
    let b;
    try {
      b = resolveBehaviour({}, call.metadata);
    } catch (err) {
      if (err instanceof BehaviourError) return invalid('BidiEcho', err, (e) => call.emit('error', e));
      throw err;
    }
    const g = stats.get(b.run).grpc;
    g.streamsOpened += 1;
    call.on('data', (message) => {
      g.streamMsgsIn += 1;
      call.write(message);
      g.streamMsgsOut += 1;
    });
    call.on('end', async () => {
      if (!(await waitUnlessCancelled(call, b.delayMs))) return record(b, 'BidiEcho', 'cancelled');
      if (b.statusCode !== grpc.status.OK) {
        record(b, 'BidiEcho', STATUS_NAME[b.statusCode]);
        return call.emit('error', statusError(b));
      }
      record(b, 'BidiEcho', 'OK');
      return call.end();
    });
    return undefined;
  },
};

// Async handlers must never leave a call hanging if they throw.
const guard = (name, fn) => (call, callback) =>
  Promise.resolve(fn(call, callback)).catch((err) => {
    log('grpc_handler_error', { method: name, error: err.message });
    const status = { code: grpc.status.INTERNAL, details: 'sut internal error' };
    if (callback) callback(status);
    else call.emit('error', status);
  });

const SERVER_OPTIONS = {
  // Long load tests reuse one connection; never recycle it mid-run (that would surface as
  // stray UNAVAILABLE errors) and accept client keepalive pings without calls in flight.
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.max_receive_message_length': config.maxPayloadBytes + 1024 * 1024,
  'grpc.max_send_message_length': config.maxPayloadBytes + 1024 * 1024,
};

const createGrpcServer = ({ reflection = true } = {}) => {
  const definition = loadDefinition();
  const { LoadSut } = grpc.loadPackageDefinition(definition).sut.v1;
  const server = new grpc.Server(SERVER_OPTIONS);
  server.addService(
    LoadSut.service,
    Object.fromEntries(Object.entries(handlers).map(([name, fn]) => [name, guard(name, fn)])),
  );
  if (reflection) new ReflectionService(definition).addToServer(server);
  return server;
};

const credentials = () => {
  if (!config.grpcTlsCert || !config.grpcTlsKey) return grpc.ServerCredentials.createInsecure();
  const fs = require('fs');
  return grpc.ServerCredentials.createSsl(null, [
    { cert_chain: fs.readFileSync(config.grpcTlsCert), private_key: fs.readFileSync(config.grpcTlsKey) },
  ], false);
};

const listen = (server, port) =>
  new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${port}`, credentials(), (err, boundPort) => (err ? reject(err) : resolve(boundPort)));
  });

module.exports = { createGrpcServer, listen, loadDefinition, PROTO_ROOT, PROTO_FILE, STATUS_NAME };
