import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function HighCls() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('sutSessionId='));
    
    if (!sessionCookie) {
      router.replace('/sut/login');
    } else {
      setIsAuthenticated(true);
      
      // Intentional 4-second delay to cause a shift after FCP/LCP
      setTimeout(() => {
        const target = document.getElementById('shift-target');
        if (target) {
          target.style.height = '300px';
          target.style.padding = '10px';
          target.innerHTML = '<h3>--- UNEXPECTED BANNER LOADED ---</h3>';
        }
      }, 4000);
    }
  }, [router]);

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>High CLS Page - SUT</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 id="cls-high-title" style={styles.title}>High CLS Page - Shifting Content</h2>
          <p style={styles.text}>
            Wait 4 seconds. An element will load and shift the text below, forcing a high CLS score.
          </p>
          <div style={styles.headerContent} id="header-content">
            Header Content
          </div>
          <p id="target-text" style={styles.targetText}>
            Target text that will be shifted.
          </p>
          <div id="shift-target" style={styles.shiftTarget}></div>
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
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #ef4444',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
  },
  title: {
    color: '#991b1b',
    marginBottom: '15px',
  },
  text: {
    marginBottom: '20px',
    fontSize: '1.1rem',
  },
  headerContent: {
    height: '100px',
    background: '#eee',
    padding: '10px',
    marginBottom: '10px',
  },
  targetText: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  shiftTarget: {
    height: 0,
    background: '#ffcccb',
    transition: 'height 0.5s',
    overflow: 'hidden',
  },
};
