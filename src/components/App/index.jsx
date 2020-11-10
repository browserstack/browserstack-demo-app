import React, { Component } from 'react';
import Header from '../Header';
import Footer from '../Footer';

import Shelf from '../Shelf/index';
import FloatCart from '../FloatChart/index';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <main style={{display: 'flex', padding: '20px 2%', margin: '0 auto 0'}}>
          <Shelf />
        </main>
        <FloatCart />
        <Footer />
      </div>
    );
  }
}

export default App;
