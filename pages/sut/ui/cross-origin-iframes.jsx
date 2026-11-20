import Head from 'next/head';

/**
 * SUT fixture: cross-origin iframe capture.
 *
 * Hidden test page (not linked from anywhere in the app) used by the A11y Engine
 * P1 sanity/WA suites to verify that, with the cross-origin iframe capture flag
 * ON, the engine surfaces accessibility violations that live inside cross-origin
 * iframes. Reachable only by direct path: /sut/ui/cross-origin-iframes
 *
 * NOTE: unlike the sibling /sut/ui/* pages this fixture is intentionally NOT
 * gated behind the sutSessionId cookie. The A11y scanner loads it with no
 * session, so an auth redirect would stop it before the iframes ever render.
 *
 * Iframes (both genuinely cross-origin to bstackdemo.com):
 *   1. Our A11y demo page (browserstack.github.io) - the deterministic source of
 *      in-iframe violations the assertion is baselined against.
 *   2. https://www.qualified.com/ - stands in as a third-party "ad" slot to prove
 *      capture works across an unrelated external origin too.
 */
export default function CrossOriginIframes() {
  return (
    <>
      <Head>
        <title>Cross-Origin Iframe Fixture - SUT</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <main style={styles.container}>
        <header style={styles.header}>
          <h1 id="fixture-title" style={styles.title}>StackDemo Partner Showcase</h1>
          <p style={styles.text}>
            A sample page that embeds partner content from other origins. Used to
            exercise accessibility scanning across cross-origin iframe boundaries.
          </p>
        </header>

        <section aria-labelledby="primary-frame-heading" style={styles.section}>
          <h2 id="primary-frame-heading" style={styles.subtitle}>Accessibility demo content</h2>
          <iframe
            id="cross-origin-frame-primary"
            title="A11y demo content (cross-origin)"
            src="https://browserstack.github.io/bs-a11y-checks/all/index.html"
            style={styles.frame}
          />
        </section>

        <section aria-labelledby="ad-frame-heading" style={styles.section}>
          <h2 id="ad-frame-heading" style={styles.subtitle}>Sponsored</h2>
          <iframe
            id="cross-origin-frame-ad"
            title="Sponsored partner (cross-origin)"
            src="https://www.qualified.com/"
            style={styles.frame}
          />
        </section>
      </main>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    color: '#1f2937',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#374151',
    marginBottom: '12px',
  },
  text: {
    fontSize: '1.05rem',
    color: '#4b5563',
  },
  section: {
    marginBottom: '32px',
  },
  frame: {
    width: '100%',
    height: '600px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
  },
};
