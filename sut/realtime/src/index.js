const config = require('./config');
const { createWsServer } = require('./ws-server');
const { createGrpcServer, listen } = require('./grpc-server');
const { createResetServer } = require('./reset-server');
const { log } = require('./log');

const main = async () => {
  const wsServer = createWsServer();
  await new Promise((resolve) => wsServer.listen(config.wsPort, '0.0.0.0', resolve));

  const grpcServer = createGrpcServer({ reflection: true });
  const grpcPort = await listen(grpcServer, config.grpcPort);
  const grpcNoReflection = createGrpcServer({ reflection: false });
  const grpcNoReflectionPort = await listen(grpcNoReflection, config.grpcNoReflectionPort);

  let resetServer;
  if (config.resetPort) {
    resetServer = createResetServer();
    await new Promise((resolve) => resetServer.listen(config.resetPort, '0.0.0.0', resolve));
  }

  log('listening', {
    ws: config.wsPort,
    grpc: grpcPort,
    grpcNoReflection: grpcNoReflectionPort,
    reset: config.resetPort || 'off',
    grpcTls: Boolean(config.grpcTlsCert),
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
