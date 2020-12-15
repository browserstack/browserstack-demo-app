import Head from 'next/head';
import Header from '../../src/components/Header';
import Footer from '../../src/components/Footer';
import { useState, useEffect } from 'react';
import Router from 'next/router';
import store2 from 'store2';
import axios from '../../src/services/axios';
import './style.scss';

const Orders = ({ }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const userName = store2.session.get('username');
  useEffect(() => {
    if(!userName) {
      Router.replace({
        pathname: '/signin',
        query: { orders: 'true' },
      });
    } else {
      const userOrders = store2.session.get('userOrders') || [];
      axios.get('/api/orders', { params: { userName } })
      .then((res) => {
        const { orders } = res.data;
        setOrders([...userOrders, ...orders]);
        setLoading(false);
      })
      .catch((e) => {
        setOrders([...userOrders]);
        setLoading(false);
      })
    }
  }, []);

  if (loading || !userName) {
    return <></>;
  }

  return (
    <>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
      </Head>
      <Header />
      <main className="fit">
        <div className="mx-auto max-w-8xl px-6">
          <div className="flex-1 p-10 flex flex-col justify-center items-center ">
            {orders.length === 0 ? (
              <>
                <span className="border border-dashed border-secondary rounded-full flex items-center justify-center w-16 h-16 p-12 bg-primary text-primary">
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" className="absolute">
                    <path d="M4 1L1 5V19C1 19.5304 1.21071 20.0391 1.58579 20.4142C1.96086 20.7893 2.46957 21 3 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V5L16 1H4Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M1 5H19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M14 9C14 10.0609 13.5786 11.0783 12.8284 11.8284C12.0783 12.5786 11.0609 13 10 13C8.93913 13 7.92172 12.5786 7.17157 11.8284C6.42143 11.0783 6 10.0609 6 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </span>
                <h2 className="pt-6 text-2xl font-bold tracking-wide text-center">No orders found</h2>
              </>
            ) : orders.map((order) => (
              <div id={order.id} key={order.id} className="a-box-group a-spacing-base order">
                <div className="a-box a-color-offset-background order-info">
                  <div className="a-box-inner">
                    <div className="a-fixed-right-grid">
                      <div className="a-fixed-right-grid-inner">
                        <div className="a-fixed-right-grid-col a-col-left">
                          <div className="a-row">
                            <div className="a-column a-span3">
                              <div className="a-row a-size-mini">
                                <span className="a-color-secondary label">
                                  Order placed
                                </span>
                              </div>
                              <div className="a-row a-size-base">
                                <span className="a-color-secondary value">
                                  {order.orderDate}
                                </span>
                              </div>
                            </div>
                            <div className="a-column a-span2">
                              <div className="a-row a-size-mini">
                                <span className="a-color-secondary label">
                                  Total
                                </span>
                              </div>
                              <div className="a-row a-size-base">
                                <span className="a-color-secondary value">
                                  ${order.total}
                                </span>
                              </div>
                            </div>
                            <div className="a-column a-span2">
                              <div className="a-row a-size-mini">
                                <span className="a-color-secondary label">
                                  Ship to
                                </span>
                              </div>
                              <div className="a-row a-size-base">
                                <span className="a-color-secondary value">
                                  {userName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="a-box shipment shipment-is-delivered">
                  <div className="a-box-inner">
                    <div className="a-row shipment-top-row js-shipment-info-container">
                      <div>
                        <div className="a-row">
                          <span className="a-size-medium a-color-base a-text-bold">
                            Delivered {order.deliveryDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="a-fixed-right-grid a-spacing-top-medium" style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
                      {order.items.map((item) => (
                        <div id={`${order.id}-${item.id}`} key={`${order.id}-${item.id}`} className="a-fixed-right-grid-inner a-grid-vertical-align a-grid-top" style={{width: 'auto'}}>
                          <div className="a-fixed-right-grid-col a-col-left">
                            <div className="a-row">
                              <div className="a-fixed-left-grid a-spacing-none">
                                <div className="a-fixed-left-grid-inner" style={{paddingLeft: '100px'}}>
                                  <div className="a-text-center a-fixed-left-grid-col a-col-left" style={{width: '100px', marginLeft: '-100px', float: 'left'}}>
                                    <div className="item-view-left-col-inner">
                                      <img src={require(`../../public/static/${item.sku}`)} className="item-image" />
                                    </div>
                                  </div>
                                  <div className="a-fixed-left-grid-col a-col-right" style={{paddingLeft: '1.5%', float: 'left'}}>
                                    <div className="a-row">
                                      <strong>Title:</strong> {item.title}
                                    </div>
                                    <div className="a-row">
                                      <strong>Description:</strong> {item.description}
                                    </div>
                                    <div className="a-row">
                                      <span className="a-size-small a-color-price">
                                        ${parseFloat(item.price).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Orders;

