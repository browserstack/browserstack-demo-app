import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

// Where the realtime SUT (sut/realtime) listens. Production sets NEXT_PUBLIC_SUT_WS_URL
// (e.g. wss://ws.bstackdemo.com); locally `npm start` in sut/realtime serves ws://localhost:8080.
const DEFAULT_WS_BASE = process.env.NEXT_PUBLIC_SUT_WS_URL || 'ws://localhost:8080';

const PRESETS = {
  echo: 'Echo every frame',
  hold: 'Close N ms after the 101',
  close: 'Close with a code',
  drop: 'Kill TCP, no close frame (1006)',
  push: 'Push N extra messages',
  reject: 'Refuse the upgrade',
};

const KNOBS = [
  { name: 'ms', label: 'ms (close after)', presets: ['echo', 'hold', 'close', 'drop', 'push'] },
  { name: 'code', label: 'close code', presets: ['hold', 'close', 'push'] },
  { name: 'n', label: 'n (push count)', presets: ['echo', 'hold', 'push'] },
  { name: 'upgradeDelayMs', label: 'upgradeDelayMs', presets: Object.keys(PRESETS) },
  { name: 'pongDelayMs', label: 'pongDelayMs', presets: ['echo', 'hold', 'push'] },
  { name: 'status', label: 'HTTP status', presets: ['reject'] },
  { name: 'run', label: 'run id', presets: Object.keys(PRESETS) },
];

// Builds the WebSocket URL for a preset and the knobs that apply to it (blank knobs are left out).
const buildSutUrl = (base, preset, knobs) => {
  const params = new URLSearchParams();
  KNOBS.filter((k) => k.presets.includes(preset) && knobs[k.name] !== undefined && String(knobs[k.name]).trim() !== '')
    .forEach((k) => params.set(k.name, String(knobs[k.name]).trim()));
  const query = params.toString();
  return `${base.replace(/\/+$/, '')}/${preset}${query ? `?${query}` : ''}`;
};

const toHttpBase = (wsBase) => wsBase.replace(/^ws/, 'http').replace(/\/+$/, '');

const GRPC_METHODS = [
  ['Unary', 'UnaryRequest { behaviour, payload }', 'One reply after behaviour.delay_ms with behaviour.status_code.'],
  ['ServerStream', 'StreamRequest { behaviour, count, interval_ms }', 'Exactly `count` messages, then the status.'],
  ['ClientStream', 'stream StreamMessage', 'Replies with how many messages arrived (behaviour from metadata).'],
  ['BidiEcho', 'stream StreamMessage', 'Echoes every message, ends on half-close (behaviour from metadata).'],
];

export default function SutRealtime() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [base, setBase] = useState(DEFAULT_WS_BASE);
  const [preset, setPreset] = useState('echo');
  const [knobs, setKnobs] = useState({ run: 'browser' });
  const [message, setMessage] = useState('hello');
  const [state, setState] = useState('idle');
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const sessionCookie = document.cookie.split('; ').find((row) => row.startsWith('sutSessionId='));
    if (!sessionCookie) router.replace('/sut/login');
    else setIsAuthenticated(true);
    return () => {
      const ws = socketRef.current;
      socketRef.current = null;
      ws?.close();
    };
  }, [router]);

  const url = buildSutUrl(base, preset, knobs);
  const addLog = (line) => setLog((prev) => [`${new Date().toISOString().slice(11, 23)}  ${line}`, ...prev].slice(0, 200));

  const connect = () => {
    socketRef.current?.close();
    const startedAt = performance.now();
    let opened = false;
    setState('connecting');
    addLog(`connecting ${url}`);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      // e.g. an unsupported scheme: the constructor throws before any handler exists.
      socketRef.current = null;
      setState('closed');
      addLog(`connection failed: ${err.message}`);
      return;
    }
    socketRef.current = ws;
    // A replaced socket still fires its close later; only the current one may update the page.
    const current = () => socketRef.current === ws;
    ws.onopen = () => {
      if (!current()) return;
      opened = true;
      setState('open');
      addLog(`open after ${Math.round(performance.now() - startedAt)} ms`);
    };
    ws.onmessage = (event) => current() && addLog(`received: ${event.data}`);
    ws.onerror = () => current() && addLog(opened ? 'error' : 'connection failed (rejected, refused or unreachable)');
    ws.onclose = (event) => {
      if (!current()) return;
      setState('closed');
      addLog(`closed with code ${event.code}${event.reason ? ` (${event.reason})` : ''} after ${Math.round(performance.now() - startedAt)} ms`);
    };
  };

  const send = () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(message);
    addLog(`sent: ${message}`);
  };

  const loadStats = async () => {
    try {
      // Trimmed like buildSutUrl, so the stats lookup uses the run id the connections sent.
      const run = String(knobs.run ?? '').trim() || '_';
      const res = await fetch(`${toHttpBase(base)}/stats?run=${encodeURIComponent(run)}`);
      setStats(await res.json());
    } catch (err) {
      setStats({ error: `stats unavailable: ${err.message}` });
    }
  };

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>SUT Realtime - WebSocket and gRPC</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title} id="realtime-title">Realtime Metric Control</h1>
          <small style={styles.subtitle}>WebSocket + gRPC system under test. Every behaviour is chosen by the client, so every metric is computable.</small>
        </header>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>WebSocket console</h2>
          <div style={styles.form}>
            <label style={styles.field}>
              Server
              <input id="ws-base" style={styles.input} value={base} onChange={(e) => setBase(e.target.value)} />
            </label>
            <label style={styles.field}>
              Endpoint
              <select id="ws-preset" style={styles.input} value={preset} onChange={(e) => setPreset(e.target.value)}>
                {Object.entries(PRESETS).map(([key, text]) => (
                  <option key={key} value={key}>{`/${key} - ${text}`}</option>
                ))}
              </select>
            </label>
            {KNOBS.filter((k) => k.presets.includes(preset)).map((k) => (
              <label key={k.name} style={styles.field}>
                {k.label}
                <input
                  id={`knob-${k.name}`}
                  style={styles.input}
                  value={knobs[k.name] ?? ''}
                  onChange={(e) => setKnobs({ ...knobs, [k.name]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p style={styles.url}>
            <code id="ws-url">{url}</code>
          </p>
          <div style={styles.actions}>
            <button id="ws-connect" style={styles.button} onClick={connect}>Connect</button>
            <input id="ws-message" aria-label="WebSocket message" style={{ ...styles.input, maxWidth: '240px' }} value={message} onChange={(e) => setMessage(e.target.value)} />
            <button id="ws-send" style={styles.button} onClick={send} disabled={state !== 'open'}>Send</button>
            <button id="ws-disconnect" style={styles.secondaryButton} onClick={() => socketRef.current?.close(1000)} disabled={state !== 'open'}>Close (1000)</button>
            <button id="ws-stats" style={styles.secondaryButton} onClick={loadStats}>Server stats for run</button>
            <span id="ws-state" style={styles.state}>{state}</span>
          </div>
          <pre id="ws-log" style={styles.log}>{log.join('\n') || 'No events yet.'}</pre>
          {stats && <pre id="ws-stats-output" style={styles.log}>{JSON.stringify(stats, null, 2)}</pre>}
          <p style={styles.note}>
            Browsers cannot send custom headers on a WebSocket upgrade, so this console uses query knobs. Load scripts can
            also send them as <code>x-sut-*</code> headers (e.g. <code>x-sut-upgrade-delay-ms</code>), which keeps one URL
            per report row in k6.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>gRPC: sut.v1.LoadSut</h2>
          <p style={styles.note}>
            Port 50051 has server reflection; port 50052 has none. The definitions are <code>sut/realtime/proto/sut/v1/load_sut.proto</code>{' '}
            and its import <code>common.proto</code>. Set behaviour in the request or as metadata: <code>x-sut-delay-ms</code>,{' '}
            <code>x-sut-status</code>, <code>x-sut-status-message</code>, <code>x-sut-payload-bytes</code>, <code>x-sut-run</code>.
          </p>
          <table style={styles.table} id="grpc-methods">
            <thead>
              <tr><th style={styles.th}>Method</th><th style={styles.th}>Request</th><th style={styles.th}>Behaviour</th></tr>
            </thead>
            <tbody>
              {GRPC_METHODS.map(([method, request, behaviour]) => (
                <tr key={method}>
                  <td style={styles.td}><code>{method}</code></td>
                  <td style={styles.td}><code>{request}</code></td>
                  <td style={styles.td}>{behaviour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link href="/sut/dashboard" id="back-to-dashboard-btn" style={styles.secondaryButton}>Back to dashboard</Link>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '40px auto', padding: '20px', fontFamily: 'Inter, sans-serif' },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { color: '#1e3a8a', fontSize: '2.5rem', margin: 0 },
  subtitle: { color: '#6b7280' },
  card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '20px' },
  sectionTitle: { borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: '10px', color: '#4a5568' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' },
  field: { display: 'flex', flexDirection: 'column', fontSize: '0.9rem', fontWeight: 500, gap: '4px' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' },
  url: { marginTop: '16px', wordBreak: 'break-all' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  button: { backgroundColor: '#1e3a8a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  secondaryButton: { backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' },
  state: { fontWeight: 600, color: '#4a5568' },
  log: { backgroundColor: '#0f172a', color: '#e2e8f0', padding: '12px', borderRadius: '8px', maxHeight: '260px', overflow: 'auto', fontSize: '0.8rem', marginTop: '12px' },
  note: { color: '#4a5568', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '12px' },
  th: { textAlign: 'left', borderBottom: '2px solid #e2e8f0', padding: '8px' },
  td: { borderBottom: '1px solid #e2e8f0', padding: '8px', verticalAlign: 'top' },
};
