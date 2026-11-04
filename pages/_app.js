import Root from "../src/Root";

// Next.js only allows global stylesheets to be imported here. The order below
// reproduces the original cascade, so keep it when adding styles.
import "../styles/globals.scss";
import "./checkout/style.scss";
import "./style.scss";
import "../src/components/Header/style.scss";
import "../src/components/Newsletter/style.scss";
import "../src/components/Footer/style.scss";
import "../src/components/FavouriteButton/style.scss";
import "../src/components/Shelf/Filter/style.scss";
import "../src/components/Clearfix/style.scss";
import "../src/components/Spinner/style.scss";
import "../src/components/Shelf/style.scss";
import "../src/components/FloatChart/style.scss";
import "./offers/style.scss";
import "./orders/style.scss";
import "./signin/style.scss";

function MyApp({ Component, pageProps }) {
  return (
    <Root>
      <Component {...pageProps} />
    </Root>
  );
}

export default MyApp;
