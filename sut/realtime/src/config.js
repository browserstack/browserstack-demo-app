const int = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
};

module.exports = {
  // HTTP + WebSocket listener (ws:// locally; TLS is terminated by the load balancer).
  wsPort: int('SUT_WS_PORT', 8080),
  // gRPC with server reflection, and a second listener with reflection off.
  grpcPort: int('SUT_GRPC_PORT', 50051),
  grpcNoReflectionPort: int('SUT_GRPC_NOREFLECT_PORT', 50052),
  // Raw TCP listener that resets every connection on accept (the "refused" leg).
  // 0 disables it.
  resetPort: int('SUT_RESET_PORT', 50099),
  // Optional in-process TLS for gRPC when the load balancer passes TCP straight through.
  grpcTlsCert: process.env.SUT_GRPC_TLS_CERT || '',
  grpcTlsKey: process.env.SUT_GRPC_TLS_KEY || '',
  // Upper bounds for every time / count knob, so one bad request cannot pin the server.
  maxDelayMs: int('SUT_MAX_DELAY_MS', 300000),
  maxCount: int('SUT_MAX_COUNT', 100000),
  maxPayloadBytes: int('SUT_MAX_PAYLOAD_BYTES', 4 * 1024 * 1024 - 1024),
  // Largest GraphQL request body read into memory; a bigger one is a 413.
  maxBodyBytes: int('SUT_MAX_BODY_BYTES', 1024 * 1024),
  // How many run ids /stats keeps before dropping the oldest.
  maxRuns: int('SUT_MAX_RUNS', 500),
  logRequests: process.env.SUT_LOG !== '0',
};
