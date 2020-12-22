import Head from 'next/head';
import { useEffect } from 'react';
import Link from 'next/link';
import { connect } from 'react-redux';
import store2 from 'store2';
import Router from 'next/router';
import axios from '../../src/services/axios';
import { emptyCart } from '../../src/services/cart/actions';
import { resetCartTotal } from '../../src/services/total/actions';
import './style.scss';

const CheckOut = ({ cartTotal, cartProducts, emptyCart, resetCartTotal }) => {
  let userName = store2.session.get('username');

  const handleFormSubmit = e => {
    e.preventDefault();
    userName = store2.session.get('username');
    axios.post('/api/checkout', {
      userName
    }).then((data) => {
      let userOrders = store2.session.get('userOrders') || [];
      store2.session.set('confirmationProducts', cartProducts);
      store2.session.set('confirmationTotal', cartTotal);
      emptyCart();
      resetCartTotal();
      const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      const today = new Date();
      userOrders.push({
        "id": Math.floor(Math.random() * 1000) + 1,
        "orderDate": today.toLocaleDateString("en-US", dateOptions),
        "total": cartTotal.totalPrice,
        "deliveryDate": today.toLocaleDateString("en-US", dateOptions),
        "items": cartProducts.map((cartProduct, index) => ({
          "sku": cartProduct.sku,
          "title": cartProduct.title,
          "id": index + 10,
          "price": cartProduct.price * cartProduct.quantity,
          "description": cartProduct.title
        }))
      });
      store2.session.set('userOrders', userOrders);
      Router.replace('/confirmation');
    }).catch((err) => {
      console.log(err);
      Router.replace({
        pathname: '/signin',
        query: { checkout: 'true' },
      });
    });
  };

  useEffect(() => {  
    userName = store2.session.get('username');
    if (!userName) {
      Router.replace({
        pathname: '/signin',
        query: { checkout: 'true' },
      });
    } else if(cartProducts.length === 0) {
      Router.replace('/');
    }
  }, []);

  if (cartProducts.length === 0) {
    return <></>;
  };

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
                        <legend className="form-legend optimizedCheckout-headingSecondary" data-test="shipping-address-heading">Shipping Address</legend>
                      </div>
                      <div>
                        <form onSubmit={handleFormSubmit} autoComplete="on">
                          <fieldset className="form-fieldset">
                            <div className="form-body">
                              <fieldset id="checkoutShippingAddress" className='form-fieldset'>
                                <div className="form-body">
                                  <div className="checkout-address">
                                    <div className="dynamic-form-field dynamic-form-field--firstName">
                                      <div className="form-field">
                                        <label for="firstNameInput" className="form-label optimizedCheckout-form-label">First Name</label>
                                        <input required autoComplete="given-name" id="firstNameInput" className='form-input optimizedCheckout-form-input' type="text" defaultValue="" />
                                      </div>
                                    </div>
                                    <div className="dynamic-form-field dynamic-form-field--lastName">
                                      <div className="form-field">
                                        <label for="lastNameInput" className="form-label optimizedCheckout-form-label">Last Name</label>
                                        <input required autoComplete="family-name" id="lastNameInput" className='form-input optimizedCheckout-form-input' type="text" defaultValue="" />
                                      </div>
                                    </div>
                                    <div className="dynamic-form-field dynamic-form-field--addressLine1">
                                      <div className="form-field">
                                        <label for="addressLine1Input" className="form-label optimizedCheckout-form-label">Address</label>
                                        <input required autoComplete="address-line1" id="addressLine1Input" className='form-input optimizedCheckout-form-input' type="text" defaultValue="" />
                                      </div>
                                    </div>
                                    <div className="dynamic-form-field dynamic-form-field--province">
                                      <div className="form-field">
                                        <label for="provinceInput" className="form-label optimizedCheckout-form-label">State/Province</label>
                                        <input required autoComplete="address-level1" id="provinceInput" className='form-input optimizedCheckout-form-input' type="text" defaultValue="" />
                                      </div>
                                    </div>
                                    <div className="dynamic-form-field dynamic-form-field--postCode">
                                      <div className="form-field">
                                        <label for="postCodeInput" className="form-label optimizedCheckout-form-label">Postal Code</label>
                                        <input required autoComplete="postal-code" id="postCodeInput" className='form-input optimizedCheckout-form-input' type="text" defaultValue="" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </fieldset>
                            </div>
                          </fieldset>
                          <div className="form-actions">
                            <button id="checkout-shipping-continue" className="button button--primary optimizedCheckout-buttonPrimary" type="submit">Submit</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
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
                    8 Items
                  </h3>
                  <ul aria-live="polite" className="productList">
                    {cartProducts.map((cartProduct) => (
                      <li id={cartProduct.id} key={cartProduct.id} className="productList-item is-visible">
                        <div className="product">
                          <figure className="product-column product-figure">
                            <img alt={cartProduct.title} src={require(`../../public/static/${cartProduct.sku}`)} />
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
                      <span>${parseFloat(cartTotal.totalPrice).toFixed(2)}</span>
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

const mapStateToProps = state => ({
  cartProducts: state.cart.products,
  cartTotal: state.total.data
});

export default connect(
  mapStateToProps,
  { emptyCart, resetCartTotal }
)(CheckOut);
