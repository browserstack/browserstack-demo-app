import Head from 'next/head';
import App from '../src/components/App';
import './style.scss';

export default function Home() {
  return (
    <div>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <App />
      <footer>
      </footer>
    </div>
  )
}
