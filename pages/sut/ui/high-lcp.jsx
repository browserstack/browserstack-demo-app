import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function HighLcp() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(row => row.startsWith('sutSessionId='));
    
    if (!sessionCookie) {
      router.replace('/sut/login');
    } else {
      setIsAuthenticated(true);
      
      // 3-second delay on the largest element
      setTimeout(() => {
        setImageLoaded(true);
      }, 3000);
    }
  }, [router]);

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>High LCP Page - SUT</title>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 id="lcp-high-title" style={styles.title}>High LCP Page - Delayed Image</h2>
          <p style={styles.text}>
            The Largest Contentful Paint (LCP) element on this page is being delayed by 3 seconds.
          </p>
          <div id="image-container" style={styles.imageContainer}>
            {!imageLoaded ? (
              <p>Loading LCP Image...</p>
            ) : (
              <img
                src="https://picsum.photos/1000/600"
                alt="Delayed LCP Image"
                style={styles.image}
              />
            )}
          </div>
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
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #f59e0b',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '24px',
  },
  title: {
    color: '#92400e',
    marginBottom: '15px',
  },
  text: {
    marginBottom: '20px',
    fontSize: '1.1rem',
  },
  imageContainer: {
    minHeight: '400px',
    background: '#e2e2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
  image: {
    width: '100%',
    borderRadius: '8px',
  },
};
