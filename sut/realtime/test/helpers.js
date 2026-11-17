const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const WebSocket = require('ws');

process.env.SUT_LOG = '0';

const { createWsServer } = require('../src/ws-server');
const { createGrpcServer, listen, loadDefinition } = require('../src/grpc-server');
const stats = require('../src/stats');

const startWs = async () => {
  const server = createWsServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    server,
    url: (p) => `ws://127.0.0.1:${port}${p}`,
    httpUrl: (p) => `http://127.0.0.1:${port}${p}`,
    close: () => new Promise((resolve) => {
      server.wss.clients.forEach((c) => c.terminate());
      server.close(resolve);
    }),
  };
};

// Opens a socket and collects everything that happens to it.
const connect = (url, options = {}) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const ws = new WebSocket(url, { perMessageDeflate: false, ...options });
    const result = { ws, startedAt, messages: [], closeCode: null, status: null, error: null };
    result.closed = new Promise((done) => {
      ws.on('close', (code) => {
        result.closeCode = code;
        result.closedAt = Date.now();
        done(result);
      });
    });
    ws.on('message', (data) => result.messages.push(data.toString()));
    ws.on('open', () => {
      result.openedAt = Date.now();
      resolve(result);
    });
    ws.on('unexpected-response', (req, res) => {
      result.status = res.statusCode;
      res.resume();
      req.destroy();
      resolve(result);
    });
    ws.on('error', (err) => {
      result.error = err;
      resolve(result);
    });
  });

const startGrpc = async ({ reflection = true } = {}) => {
  const server = createGrpcServer({ reflection });
  const port = await listen(server, 0);
  const { LoadSut } = grpc.loadPackageDefinition(loadDefinition()).sut.v1;
  const client = new LoadSut(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  return {
    port,
    client,
    close: () => new Promise((resolve) => {
      client.close();
      server.tryShutdown(resolve);
    }),
  };
};

const reflectionClient = (port, version = 'v1') => {
  const file = path.join(path.dirname(require.resolve('@grpc/reflection')), '..', 'proto', 'grpc', 'reflection', version, 'reflection.proto');
  const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(file, { keepCase: true }));
  const Service = pkg.grpc.reflection[version].ServerReflection;
  return new Service(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
};

const metadata = (pairs) => {
  const md = new grpc.Metadata();
  Object.entries(pairs).forEach(([k, v]) => md.set(k, String(v)));
  return md;
};

const unary = (client, request, md = new grpc.Metadata(), options = {}) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    client.Unary(request, md, options, (err, reply) => resolve({ err, reply, elapsed: Date.now() - startedAt }));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { startWs, connect, startGrpc, reflectionClient, metadata, unary, sleep, stats, grpc };
