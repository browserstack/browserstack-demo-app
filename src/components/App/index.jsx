import React, { Component } from "react";
import axios from "../../services/axios";
import Header from "../Header";
import Footer from "../Footer";

import Shelf from "../Shelf/index";
import FloatCart from "../FloatChart/index";

class App extends Component {
  state = {
    is2G: null,
  };

  componentDidMount() {
    const connection =
      window.navigator.connection ||
      window.navigator.mozConnection ||
      window.navigator.webkitConnection;
    const is2gConnection =
      (connection &&
        connection.effectiveType &&
        connection.effectiveType.indexOf("2g") >= 0) ||
      false;
    this.setState({ is2G: is2gConnection });

    // Bug: failed request
    axios.get("/failed-request").catch((e) => console.log(e));
  }
  render() {
    const { is2G } = this.state;
    if (is2G === null) {
      return <></>;
    }

    if (is2G) {
      return (
        <div className="App">
          <Header />
          <main
            style={{
              padding: "50px 5%",
              margin: "0 auto",
              textAlign: "center",
              height: "100vh",
            }}
          >
            <strong>
              Good news is we are online but bad news is you are on slow network
            </strong>
          </main>
          <Footer />
        </div>
      );
    }
    return (
      <div className="App">
        <Header />
        <main style={{ padding: "20px 2%", margin: "0 auto" }}>
          <a href="#" >
            <img className="m-auto h-56 " alt="banner main" style={{minWidth: '650px', minHeight: '260px'}} src={require(`../../../public/static/banner3.png`)} />
          </a>
          <Shelf />
        </main>
        <FloatCart />
        <Footer />
      </div>
    );
  }
}

export default App;
