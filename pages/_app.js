import { useEffect } from "react";
import Root from "../src/Root";
import "../styles/globals.scss";
import "./style.scss";
// Component-level global styles (Next.js requires global styles to be imported from _app.js)
import "../src/components/Footer/style.scss";
import "../src/components/Spinner/style.scss";
import "../src/components/Header/style.scss";
import "../src/components/Newsletter/style.scss";
import "../src/components/Shelf/style.scss";
import "../src/components/Shelf/Filter/style.scss";
import "../src/components/Clearfix/style.scss";
import "../src/components/FloatChart/style.scss";

function MyApp({ Component, pageProps }) {
  return (
    <Root>
      <Component {...pageProps} />
    </Root>
  );
}

export default MyApp;
