// GraphQL over HTTP (graphql-http, spec-compliant) on /graphql and /graphql-nointrospect, and
// subscriptions over WebSocket (graphql-ws, subprotocol graphql-transport-ws) on /graphql.
// Every field is a knob, so each GraphQL metric in a Load Testing run is computable.

const { buildSchema, GraphQLError, NoSchemaIntrospectionCustomRule, Kind } = require('graphql');
const { createHandler } = require('graphql-http/lib/use/http');
const { useServer } = require('graphql-ws/use/ws');
const { WebSocketServer } = require('ws');
const config = require('./config');
const stats = require('./stats');
const knobsLib = require('./knobs');
const { log } = require('./log');

const SDL = /* GraphQL */ `
  type Query {
    "Returns the message unchanged."
    echo(message: String!): String!
    "Resolves after ms milliseconds: the response-time knob."
    delay(ms: Int!): Delay!
    "Returns count items with bytes of filler each: the payload-size knob."
    items(count: Int!, bytes: Int = 0): [Item!]!
    "Raises a GraphQL error (HTTP 200, this field null) with extensions.code."
    fail(code: String = "SUT_INJECTED", message: String): String
    "Start of an endless chain: a query nests node { child { child ... } } as deep as it likes."
    node: Node!
  }

  type Mutation {
    "Creates an item after delayMs."
    createItem(name: String!, delayMs: Int = 0): Item!
  }

  type Subscription {
    "Sends count ticks, intervalMs apart (first one immediately), then completes."
    ticks(count: Int!, intervalMs: Int = 0): Tick!
  }

  type Delay { ms: Int!, servedAt: String! }
  type Item { id: ID!, name: String!, filler: String! }
  type Node { level: Int!, child: Node! }
  type Tick { seq: Int!, of: Int! }
`;

const schema = buildSchema(SDL);
const GRAPHQL_PATHS = new Set(['/graphql', '/graphql-nointrospect']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const badInput = (message) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const bounded = (name, value, max) => {
  if (!Number.isInteger(value) || value < 0 || value > max) throw badInput(`${name} must be between 0 and ${max}, got ${value}`);
  return value;
};

// buildSchema has no resolver map: graphql's default resolver calls a method of the same name.
class Node {
  constructor(level) { this.level = level; }
  child() { return new Node(this.level + 1); }
}

let lastItemId = 0;

const rootValue = {
  echo: ({ message }) => message,
  delay: async ({ ms }) => {
    await sleep(bounded('ms', ms, config.maxDelayMs));
    return { ms, servedAt: new Date().toISOString() };
  },
  items: ({ count, bytes }) => {
    bounded('count', count, config.maxCount);
    bounded('bytes', bytes, config.maxPayloadBytes);
    if (count * bytes > config.maxPayloadBytes) throw badInput(`count x bytes must be at most ${config.maxPayloadBytes}`);
    const filler = 'x'.repeat(bytes);
    return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), name: `item ${i + 1}`, filler }));
  },
  fail: ({ code, message }) => {
    throw new GraphQLError(message || `sut: injected ${code}`, { extensions: { code } });
  },
  node: () => new Node(1),
  createItem: async ({ name, delayMs }) => {
    await sleep(bounded('delayMs', delayMs, config.maxDelayMs));
    lastItemId += 1;
    return { id: String(lastItemId), name, filler: '' };
  },
  // Subscription source: graphql maps each event through the `ticks` field of the payload.
  ticks: async function* ticks({ count, intervalMs }, context) {
    bounded('count', count, config.maxCount);
    bounded('intervalMs', intervalMs, config.maxDelayMs);
    const g = stats.get(context?.run).graphql;
    for (let seq = 1; seq <= count; seq += 1) {
      if (seq > 1 && intervalMs) await sleep(intervalMs);
      g.ticksSent += 1;
      yield { ticks: { seq, of: count } };
    }
  },
};

// "<type> <name>" of the operation that ran, e.g. "query GetItems" or "query anonymous".
const operationLabel = (args) => {
  const ops = (args.document?.definitions || []).filter((d) => d.kind === Kind.OPERATION_DEFINITION);
  const op = args.operationName ? ops.find((d) => d.name?.value === args.operationName) : ops[0];
  return `${op?.operation || 'query'} ${op?.name?.value || args.operationName || 'anonymous'}`;
};

const recordOperation = (run, label, result) => {
  const g = stats.get(run).graphql;
  const errors = result?.errors?.length || 0;
  // partial = errors plus at least one top-level field with data; all-null data is an error.
  const hasData = Boolean(result?.data) && Object.values(result.data).some((v) => v !== null);
  const outcome = !errors ? 'ok' : hasData ? 'partial' : 'error';
  stats.bump(g.operations, `${label} ${outcome}`);
  g.graphqlErrors += errors;
};

const makeHttpHandler = ({ introspection }) => createHandler({
  schema,
  rootValue,
  context: (req) => ({ run: req.raw.sutRun }),
  validationRules: introspection ? undefined : (req, args, specifiedRules) => [...specifiedRules, NoSchemaIntrospectionCustomRule],
  onOperation: (req, args, result) => {
    recordOperation(req.raw.sutRun, operationLabel(args), result);
  },
});

const sendJson = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

const createGraphql = () => {
  const handlers = {
    '/graphql': makeHttpHandler({ introspection: true }),
    '/graphql-nointrospect': makeHttpHandler({ introspection: false }),
  };

  // Request-level knobs (query param or x-sut-* header, header wins):
  //   delayMs  wait before handling the request (keeps the query text, and so the operation row, unchanged)
  //   status   answer with this HTTP status (400-599) and a GraphQL error body, without executing
  //   run      count the request under /stats?run=<id>
  const handleHttp = async (req, res, path, url) => {
    const params = knobsLib.withHeaderKnobs(url.searchParams, req.headers);
    const run = params.get('run') || undefined;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.on('finish', () => stats.bump(stats.get(run).graphql.httpStatus, String(res.statusCode)));

    let delayMs;
    let status;
    try {
      delayMs = knobsLib.readInt(params, 'delayMs', { max: config.maxDelayMs }) ?? 0;
      status = knobsLib.readInt(params, 'status', { min: 400, max: 599 });
    } catch (err) {
      if (!(err instanceof knobsLib.KnobError)) throw err;
      return sendJson(res, 400, { errors: [{ message: err.message }] });
    }
    if (delayMs) await sleep(delayMs);
    if (status !== undefined) {
      log('graphql_status', { path, status, run });
      // extensions.code makes it a coded GraphQL error in Load Testing's Errors tab.
      return sendJson(res, status, { errors: [{ message: `sut: injected HTTP ${status}`, extensions: { code: `HTTP_${status}` } }] }, status === 429 ? { 'Retry-After': '1' } : {});
    }
    req.sutRun = run;
    return handlers[path](req, res);
  };

  // Subscriptions: graphql-ws closes with 4406 unless the client asks for graphql-transport-ws.
  const subscriptions = new WebSocketServer({ noServer: true });
  useServer({
    schema,
    roots: { subscription: rootValue, query: rootValue, mutation: rootValue },
    context: (ctx) => ({ run: ctx.extra.request.sutRun }),
    onSubscribe: (ctx) => {
      stats.get(ctx.extra.request.sutRun).graphql.subscriptionsStarted += 1;
    },
    onComplete: (ctx) => {
      stats.get(ctx.extra.request.sutRun).graphql.subscriptionsCompleted += 1;
    },
  }, subscriptions);

  const handleUpgrade = (req, socket, head, url) => {
    const params = knobsLib.withHeaderKnobs(url.searchParams, req.headers);
    req.sutRun = params.get('run') || undefined;
    stats.get(req.sutRun).graphql.wsConnections += 1;
    subscriptions.handleUpgrade(req, socket, head, (ws) => subscriptions.emit('connection', ws, req));
  };

  return { handleHttp, handleUpgrade, subscriptions };
};

module.exports = { createGraphql, GRAPHQL_PATHS, schema, SDL };
