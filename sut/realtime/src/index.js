const config = require('./config');
const { createWsServer } = require('./ws-server');
const { createGrpcServer, listen } = require('./grpc-server');
const { createResetServer } = require('./reset-server');
const { log } = require('./log');

// Rejects on a bind error (e.g. port in use) so main's fatal log runs.
const listenOn = (server, port) =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => { server.off('error', reject); resolve(); });
  });

const main = async () => {
  const wsServer = createWsServer();
  await listenOn(wsServer, config.wsPort);

  const grpcServer = createGrpcServer({ reflection: true });
  const grpcPort = await listen(grpcServer, config.grpcPort);
  const grpcNoReflection = createGrpcServer({ reflection: false });
  const grpcNoReflectionPort = await listen(grpcNoReflection, config.grpcNoReflectionPort);

  let resetServer;
  if (config.resetPort) {
    resetServer = createResetServer();
    await listenOn(resetServer, config.resetPort);
  }

  log('listening', {
    ws: config.wsPort,
    grpc: grpcPort,
    grpcNoReflection: grpcNoReflectionPort,
    reset: config.resetPort || 'off',
    grpcTls: Boolean(config.grpcTlsCert && config.grpcTlsKey),
  });

  const shutdown = (signal) => {
    log('shutdown', { signal });
    wsServer.wss.clients.forEach((ws) => ws.close(1001, 'server shutting down'));
    wsServer.graphqlWss.clients.forEach((ws) => ws.close(1001, 'server shutting down'));
    wsServer.close();
    resetServer?.close();
    grpcServer.tryShutdown(() => {});
    grpcNoReflection.tryShutdown(() => {});
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

main().catch((err) => {
  log('fatal', { error: err.message });
  process.exit(1);
});
