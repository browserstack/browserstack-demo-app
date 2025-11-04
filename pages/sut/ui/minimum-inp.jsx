import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function MinimumInp() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [output, setOutput] = useState('');

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('sutSessionId='));
    
    if (!sessionCookie) {
      router.replace('/sut/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleClick = () => {
    setOutput('Interaction complete! (INP should be very low)');
  };

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Minimum INP Page - SUT</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Minimum INP Page</h2>
          <p style={styles.text}>
            Click the button to test fast interaction responsiveness (INP). The script is non-blocking.
          </p>
          <button id="inp-btn" onClick={handleClick} style={styles.button}>
            Click for Fast INP Test
          </button>
          {output && (
            <div id="output" style={styles.output}>
              {output}
            </div>
          )}
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
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #3b82f6',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    textAlign: 'center',
  },
  title: {
    color: '#1e40af',
    marginBottom: '15px',
  },
  text: {
    marginBottom: '20px',
    fontSize: '1.1rem',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '15px',
  },
  output: {
    marginTop: '15px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
};
