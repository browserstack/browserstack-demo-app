import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ZeroCls() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('sutSessionId='));
    
    if (!sessionCookie) {
      router.replace('/sut/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Zero CLS Page - SUT</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 id="cls-zero-title" style={styles.title}>Layout is Stable (CLS: 0.0)</h2>
          <p style={styles.text}>
            This page loads all content instantly. Your load product should report a CLS score of 0.0.
          </p>
          <Link href="/sut/dashboard">
            <a id="back-to-dashboard-btn" style={styles.button}>
              Back to Dashboard
            </a>
          </Link>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #10b981',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    textAlign: 'center',
  },
  title: {
    color: '#065f46',
    marginBottom: '15px',
  },
  text: {
    marginBottom: '20px',
    fontSize: '1.1rem',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
