import Head from 'next/head';
import { useState, useEffect } from 'react';
import Router from 'next/router';
import Link from 'next/link';
import store2 from 'store2';
const { jsPDF } = require("jspdf");
import 'jspdf-autotable'
import '../checkout/style.scss';

const CheckOut = ({ cartTotal }) => {
  const [cartProducts, setCartProducts] = useState([]);
  const [confirmationTotal, setConfirmationTotal] = useState({});

  useEffect(() => {
    const products = store2.session.get('confirmationProducts');
    if (!products || products.length === 0) {
      Router.replace('/');
    } else {
      setCartProducts(products);
      setConfirmationTotal(store2.session.get('confirmationTotal'));
    }
  }, []);

  if (!cartProducts || cartProducts.length === 0) {
    return <></>;
  }

  function generatePDF() {
    const doc = new jsPDF()
    doc.text('BrowserStack Demo', 14, 20)
    doc.autoTable({
      head: [['Brand', 'Type', 'Quantity', 'Price']],
      body:
          cartProducts.map(({availableSizes, title, quantity, price}) => {
            return [
              availableSizes[0],
              title,
              quantity,
              '$' + parseFloat(price).toFixed(2) + '.00'
            ]
          }),
      startY: 25,
    })
    doc.text('Total price: $' + parseFloat(confirmationTotal.totalPrice).toFixed(2), 14, doc.lastAutoTable.finalY + 10)
    doc.save('confirmation.pdf')
  }

  return (
    <>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="checkoutHeader optimizedCheckout-header">
        <div className="checkoutHeader-content">
          <h2 className="checkoutHeader-heading">
            <Link href="/">
              <a className="checkoutHeader-link">StackDemo</a>
            </Link>
          </h2>
        </div>
      </div>
      <div id="checkout-app">
        <div className="layout optimizedCheckout-contentPrimary">
          <div className="main-checkout-layout">
            <div className="layout-main">
              <ol className="checkout-steps">
                <li className="checkout-step optimizedCheckout-checkoutStep checkout-step--shipping">
                  <div className="checkout-view-content">
                    <div className="checkout-form">
                      <div className="form-legend-container">
                        <legend id="confirmation-message" className="form-legend optimizedCheckout-headingSecondary" data-test="shipping-address-heading">Your Order has been successfully placed.</legend>
                      </div>
                      <div>
                        Your order number is <strong>{Math.floor(Math.random() * 100) + 1}</strong>. Download <a className="underline cursor-pointer" onClick={generatePDF}>here</a> an overview of the ordered items.
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
              <div className="continueButtonContainer">
                <Link replace href="/">
                  <a>
                    <button className="button button--tertiary optimizedCheckout-buttonSecondary">
                      Continue Shopping »
                    </button>
                  </a>
                </Link>
              </div>
            </div>
            <aside className="layout-cart">
              <article className="cart optimizedCheckout-orderSummary" data-test="cart">
                <header className="cart-header">
                  <h3 className="cart-title optimizedCheckout-headingSecondary">
                    Order Summary
                  </h3>
                </header>
                <section className="cart-section optimizedCheckout-orderSummary-cartSection">
                  <h3 className="cart-section-heading optimizedCheckout-contentPrimary">
                    {confirmationTotal.productQuantity} item(s)
                  </h3>
                  <ul aria-live="polite" className="productList">
                    {cartProducts.map((cartProduct) => (
                      <li id={cartProduct.id} key={cartProduct.id} className="productList-item is-visible">
                        <div className="product">
                          <figure className="product-column product-figure">
                            <img style={{height: '60px'}} alt={cartProduct.title} src={require(`../../public/static/${cartProduct.sku}`)} />
                          </figure>
                          <div className="product-column product-body">
                            <h5 className="product-title optimizedCheckout-contentPrimary">
                              {cartProduct.title}
                            </h5>
                            <ul className="product-options optimizedCheckout-contentSecondary">
                              <li className="product-option">{cartProduct.availableSizes[0]}</li>
                              <li className="product-option">{cartProduct.quantity}</li>
                            </ul>
                          </div>
                          <div className="product-column product-actions">
                            <div className="product-price optimizedCheckout-contentPrimary">
                              ${cartProduct.price * cartProduct.quantity}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="cart-section optimizedCheckout-orderSummary-cartSection">
                  <div className="cart-total">
                    <div className="cart-priceItem optimizedCheckout-contentPrimary cart-priceItem--total">
                      <span className="cart-priceItem-label">Total (USD)</span>
                      <span className="cart-priceItem-value">
                      <span>${parseFloat(confirmationTotal.totalPrice).toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                </section>
              </article>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckOut;

