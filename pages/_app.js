import { useEffect } from "react";
import Root from "../src/Root";
import "../styles/globals.scss";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    document.querySelector("#__next")?.setAttribute?.("id", "");
  }, []);
  return (
    <Root>
      <Component {...pageProps} />
    </Root>
  );
}

export default MyApp;
