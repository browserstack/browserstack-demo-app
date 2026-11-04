import Root from "../src/Root";
import "../styles/globals.scss";
import "../src/components/Clearfix/style.scss";
import "../src/components/Spinner/style.scss";
import "../src/components/Header/style.scss";
import "../src/components/Shelf/Filter/style.scss";
import "../src/components/Shelf/style.scss";
import "../src/components/FavouriteButton/style.scss";
import "../src/components/FloatChart/style.scss";
import "../src/components/Newsletter/style.scss";
import "../src/components/Footer/style.scss";
import "../pages/checkout/style.scss";
import "../pages/offers/style.scss";
import "../pages/orders/style.scss";
import "../pages/signin/style.scss";
import "../pages/style.scss";

function MyApp({ Component, pageProps }) {
  return (
    <Root>
      <Component {...pageProps} />
    </Root>
  );
}

export default MyApp;
