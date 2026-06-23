import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SutDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication on client side
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('sutSessionId='));
    
    if (!sessionCookie) {
      router.replace('/sut/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'sutSessionId=; path=/; max-age=0';
    router.push('/sut/login');
  };

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>SUT Dashboard - Metric Control</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Metric Control Dashboard</h1>
          <small style={styles.subtitle}>Custom Load Testing System Under Test (SUT)</small>
        </header>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>API Metric Control Endpoints (For k6 / JMeter)</h2>
          <div style={styles.grid}>
            <a href="/api/control/latency/avg" id="api-latency-avg" style={{ ...styles.testLink, ...styles.success }}>
              <strong>/api/latency/avg (500ms)</strong><br />Test Avg RT & TTFB.
            </a>
            <a href="/api/control/latency/p99-outlier" id="api-latency-p99-outlier" style={{ ...styles.testLink, ...styles.warning }}>
              <strong>/api/latency/p99 (1% @ 5s)</strong><br />Validate P99/P95 percentile calculation.
            </a>
            <a href="/api/control/latency/threshold" id="api-latency-threshold" style={{ ...styles.testLink, ...styles.danger }}>
              <strong>/api/latency/threshold (3.5s)</strong><br />Test Slow Endpoint Flagging.
            </a>
            <a href="/api/control/error/success" id="api-error-success" style={{ ...styles.testLink, ...styles.success }}>
              <strong>/api/error/success (200 OK)</strong><br />Target for 2xx Count / Zero Error Rate.
            </a>
            <a href="/api/control/error/client-fail" id="api-error-4xx" style={{ ...styles.testLink, ...styles.danger }}>
              <strong>/api/error/client-fail (401)</strong><br />Test 4xx Count Tracking.
            </a>
            <a href="/api/control/error/server-fail" id="api-error-5xx" style={{ ...styles.testLink, ...styles.danger }}>
              <strong>/api/error/server-fail (503)</strong><br />Test 5xx Count Tracking.
            </a>
            <a href="/api/control/error/redirect-temp" id="api-error-3xx" style={{ ...styles.testLink, ...styles.warning }}>
              <strong>/api/error/redirect (307)</strong><br />Test 3xx Count Tracking.
            </a>
            <a href="/api/zero/errors" id="api-zero-errors" style={{ ...styles.testLink, ...styles.success }}>
              <strong>/api/zero/errors (Clean Run)</strong><br />Target for Zero 4xx/5xx Reporting.
            </a>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>UI Metric Control Pages (For Playwright / Selenium)</h2>
          <div style={styles.grid}>
            <Link href="/sut/ui/zero-cls">
              <a id="ui-zero-cls" style={{ ...styles.testLink, ...styles.success }}>
                <strong>UI: Zero CLS Page</strong><br />Validate CLS Score is 0.0.
              </a>
            </Link>
            <Link href="/sut/ui/minimum-inp">
              <a id="ui-minimum-inp" style={{ ...styles.testLink, ...styles.info }}>
                <strong>UI: Minimum INP Page</strong><br />Validate Fast Interaction Responsiveness.
              </a>
            </Link>
            <Link href="/sut/ui/high-cls">
              <a id="ui-high-cls" style={{ ...styles.testLink, ...styles.danger }}>
                <strong>UI: High CLS Shift Page</strong><br />Force unexpected layout shift.
              </a>
            </Link>
            <Link href="/sut/ui/high-lcp">
              <a id="ui-high-lcp" style={{ ...styles.testLink, ...styles.warning }}>
                <strong>UI: High LCP Page (3s Delay)</strong><br />Force slow page load/Largest Contentful Paint.
              </a>
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button onClick={handleLogout} id="logout-btn" style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    color: '#1e3a8a',
    fontSize: '2.5rem',
    margin: 0,
  },
  subtitle: {
    color: '#6b7280',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '20px',
  },
  sectionTitle: {
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
    marginTop: '10px',
    color: '#4a5568',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  testLink: {
    display: 'block',
    padding: '16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'transform 0.1s, box-shadow 0.1s',
    cursor: 'pointer',
  },
  success: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #10b981',
  },
  warning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #f59e0b',
  },
  danger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #ef4444',
  },
  info: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #3b82f6',
  },
  logoutButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
