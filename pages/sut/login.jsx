import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DUMMY_USERNAME, DUMMY_PASSWORD, sessions, generateSessionId } from '../../src/services/sut-utils';

export default function SutLogin() {
  const router = useRouter();
  const [username, setUsername] = useState(DUMMY_USERNAME);
  const [password, setPassword] = useState(DUMMY_PASSWORD);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username === DUMMY_USERNAME && password === DUMMY_PASSWORD) {
      const sessionId = generateSessionId();
      sessions[sessionId] = { userId: DUMMY_USERNAME, timestamp: Date.now() };

      // Set cookie on client side
      document.cookie = `sutSessionId=${sessionId}; path=/; max-age=3600`;
      
      router.push('/sut/dashboard');
    } else {
      setError('Login failed. Please check credentials.');
    }
  };

  return (
    <>
      <Head>
        <title>SUT Login - Load Testing</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>SDET Login</h2>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="username-input" style={styles.label}>
                Username ({DUMMY_USERNAME})
              </label>
              <input
                type="text"
                id="username-input"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="password-input" style={styles.label}>
                Password ({DUMMY_PASSWORD})
              </label>
              <input
                type="password"
                id="password-input"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
            <button type="submit" id="login-submit-btn" style={styles.button}>
              Log In
            </button>
            {error && <div style={styles.error}>{error}</div>}
          </form>
          <p style={styles.hint}>
            <small>Use dummy credentials for load testing.</small>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    textAlign: 'center',
  },
  heading: {
    color: '#1e3a8a',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  button: {
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '10px',
    fontWeight: '600',
  },
  error: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
  },
  hint: {
    marginTop: '15px',
    color: '#6b7280',
  },
};
