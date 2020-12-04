import Head from 'next/head';
import App from '../src/components/App';
import './style.scss';

export default function Home() {
  return (
    <div>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
      </Head>
      <App />
      <footer>
      </footer>
    </div>
  )
}
