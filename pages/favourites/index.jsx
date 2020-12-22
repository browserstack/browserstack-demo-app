import Head from 'next/head';
import { useEffect } from 'react';
import store2 from 'store2';
import Router from 'next/router';
import App from '../../src/components/App';

const Favourites = () => {
  let userName = store2.session.get('username');

  useEffect(() => {
    if(!userName) {
      Router.replace({
        pathname: '/signin',
        query: { favourites: 'true' },
      });
    }
  }, []);

  if(!userName) {
    return <></>;
  }
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
  );
};


export default Favourites;
