import Root from '../src/Root';
import '../styles/globals.scss';

function MyApp({ Component, pageProps }) {
  return <Root><Component {...pageProps} /></Root>;
};

export default MyApp;
