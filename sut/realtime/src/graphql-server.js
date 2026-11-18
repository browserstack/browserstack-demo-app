// GraphQL over HTTP (graphql-http, spec-compliant) on /graphql and /graphql-nointrospect, and
// subscriptions over WebSocket (graphql-ws, subprotocol graphql-transport-ws) on /graphql.
// Every field is a knob, so each GraphQL metric in a Load Testing run is computable.

const {
  buildSchema, GraphQLError, NoSchemaIntrospectionCustomRule, Kind, parse, getOperationAST, execute, defaultFieldResolver,
} = require('graphql');
const { createHandler } = require('graphql-http');
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

// Knob bounds limit each argument, but aliases repeat a field (256 aliases of a 4 MB filler is
// 1 GiB), so every HTTP request also has a budget of fields and string bytes, spent as each
// field resolves and checked before anything is serialized.
const newBudget = () => ({ fields: config.maxResponseFields, bytes: config.maxPayloadBytes });
const budgetedResolver = (source, args, context, info) => {
  const value = defaultFieldResolver(source, args, context, info);
  const budget = context?.budget;
  if (budget) {
    budget.fields -= 1;
    if (typeof value === 'string') budget.bytes -= value.length;
    if (budget.fields < 0 || budget.bytes < 0) {
      throw badInput(`response over the per-request budget: ${config.maxResponseFields} fields, ${config.maxPayloadBytes} bytes of strings`);
    }
  }
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
  // A hand-written iterator rather than a generator: return() (client gone) must cancel a pending
  // interval, which a generator only sees at its next yield, after counting one more tick.
  ticks: ({ count, intervalMs }, context) => {
    bounded('count', count, config.maxCount);
    bounded('intervalMs', intervalMs, config.maxDelayMs);
    let seq = 0;
    let done = false;
    let timer;
    let wake;
    const finish = async () => {
      done = true;
      clearTimeout(timer);
      if (wake) wake();
      return { value: undefined, done: true };
    };
    return {
      [Symbol.asyncIterator]() { return this; },
      async next() {
        if (done || seq >= count) return finish();
        if (seq > 0 && intervalMs) {
          await new Promise((resolve) => { wake = resolve; timer = setTimeout(resolve, intervalMs); });
          wake = undefined;
          if (done) return { value: undefined, done: true };
        }
        seq += 1;
        // Looked up per tick, so a /reset during the subscription does not strand the count.
        stats.get(context?.run).graphql.ticksSent += 1;
        return { value: { ticks: { seq, of: count } }, done: false };
      },
      return: finish,
    };
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

const makeHandler = ({ introspection }) => createHandler({
  schema,
  rootValue,
  context: (req) => ({ run: req.raw.sutRun, budget: newBudget() }),
  execute: (args) => execute({ ...args, fieldResolver: budgetedResolver }),
  validationRules: introspection ? undefined : (req, args, specifiedRules) => [...specifiedRules, NoSchemaIntrospectionCustomRule],
  onOperation: (req, args, result) => {
    recordOperation(req.raw.sutRun, operationLabel(args), result);
  },
});

const sendJson = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

class BodyTooLarge extends Error {}

// graphql-http's own node adapter reads the whole body with no limit; this one stops at max.
const readBody = (req, max) => new Promise((resolve, reject) => {
  if (Number(req.headers['content-length']) > max) return reject(new BodyTooLarge());
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    if (size > max) return;
    size += chunk.length;
    if (size > max) return reject(new BodyTooLarge());
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

// The node adapter of graphql-http, with a bounded body read in front of it.
const makeHttpHandler = (options) => {
  const handle = makeHandler(options);
  return async (req, res) => {
    let body = '';
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await readBody(req, config.maxBodyBytes);
      } catch (err) {
        if (!(err instanceof BodyTooLarge)) throw err;
        // The rest of an oversized body is read and dropped, never buffered; Connection: close
        // ends the socket after the 413 without resetting a client that is still sending.
        req.resume();
        return sendJson(res, 413, { errors: [{ message: `request body over ${config.maxBodyBytes} bytes` }] }, { Connection: 'close' });
      }
    }
    const [result, init] = await handle({
      url: req.url, method: req.method, headers: req.headers, body: () => body, raw: req, context: { res },
    });
    res.writeHead(init.status, init.statusText, init.headers).end(result);
    return undefined;
  };
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
  // Queries and mutations go over HTTP, where they are counted as operations; over WebSocket they
  // are refused, so the subscription counters hold subscriptions only.
  const subscriptions = new WebSocketServer({ noServer: true });
  useServer({
    schema,
    roots: { subscription: rootValue },
    context: (ctx) => ({ run: ctx.extra.request.sutRun }),
    onSubscribe: (ctx, id, payload) => {
      let op;
      try {
        op = getOperationAST(parse(payload.query), payload.operationName);
      } catch (err) {
        // Returned, not left to graphql-ws: a thrown syntax error closes the whole socket (4500)
        // and every other subscription on it.
        if (err instanceof GraphQLError) return [err];
        throw err;
      }
      if (op && op.operation !== 'subscription') {
        return [new GraphQLError(`sut: send ${op.operation} operations over HTTP; this WebSocket takes subscriptions only`)];
      }
      return undefined;
    },
    // After validation, and paired with onComplete: a subscription that fails validation is
    // neither started nor completed.
    onOperation: (ctx) => {
      stats.get(ctx.extra.request.sutRun).graphql.subscriptionsStarted += 1;
    },
    onComplete: (ctx) => {
      stats.get(ctx.extra.request.sutRun).graphql.subscriptionsCompleted += 1;
    },
  }, subscriptions);

  const handleUpgrade = (req, socket, head, url) => {
    const params = knobsLib.withHeaderKnobs(url.searchParams, req.headers);
    req.sutRun = params.get('run') || undefined;
    subscriptions.handleUpgrade(req, socket, head, (ws) => {
      // Counted once the socket is open: ws answers a malformed upgrade itself with a 400.
      stats.get(req.sutRun).graphql.wsConnections += 1;
      subscriptions.emit('connection', ws, req);
    });
  };

  return { handleHttp, handleUpgrade, subscriptions };
};

module.exports = { createGraphql, GRAPHQL_PATHS, schema, SDL };
