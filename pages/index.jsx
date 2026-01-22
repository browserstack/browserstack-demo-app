import Head from 'next/head';
import App from '../src/components/App';
import './style.scss';

export default function Home() {
  return (
    <div>
      <Head>
        <title>ShopFlowDemo</title>
        <link rel="icon" href="/favicon.png" sizes="any" type="image/svg+xml"/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="author"/>
      </Head>
      <App />
      <footer>
      </footer>
    </div>
  )
}
