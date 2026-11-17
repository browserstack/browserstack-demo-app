// Server-side ground truth, counted per run id (the `run` query param or x-sut-run metadata).
// A Load Testing run's figures can be compared against GET /stats?run=<id>.

const config = require('./config');

const DEFAULT_RUN = '_';

const emptyRun = () => ({
  createdAt: new Date().toISOString(),
  ws: {
    upgradesAccepted: 0,
    upgradesRejected: {},   // HTTP status -> count
    msgsIn: 0,
    msgsOut: 0,
    pingsIn: 0,
    pongsOut: 0,
    closes: {},             // close code ('1000', '1006', ...) -> count
    open: 0,
    peakConcurrent: 0,
    authHeaders: 0,         // upgrades that carried an Authorization header
  },
  http: {},                 // "<path> <status>" -> count
  grpc: {
    calls: {},              // "<method> <status>" -> count
    cancelled: 0,           // client gave up (deadline / cancel) before the reply
    streamsOpened: 0,
    streamMsgsIn: 0,
    streamMsgsOut: 0,
  },
});

const runs = new Map();

const runKey = (run) => (typeof run === 'string' && run.length > 0 ? run.slice(0, 128) : DEFAULT_RUN);

const get = (run) => {
  const key = runKey(run);
  let entry = runs.get(key);
  if (!entry) {
    entry = emptyRun();
    runs.set(key, entry);
    // Map keeps insertion order, so the first key is the oldest run.
    while (runs.size > config.maxRuns) runs.delete(runs.keys().next().value);
  }
  return entry;
};

const bump = (bucket, key, by = 1) => {
  bucket[key] = (bucket[key] || 0) + by;
};

module.exports = {
  DEFAULT_RUN,
  runKey,
  get,
  bump,
  snapshot: (run) => (runs.has(runKey(run)) ? runs.get(runKey(run)) : null),
  list: () => [...runs.keys()],
  reset: (run) => (run === undefined ? runs.clear() : runs.delete(runKey(run))),
};
