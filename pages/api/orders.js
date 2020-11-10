import ordersData from '../../src/constants/orders.json';

export default (req, res) => {
  const userName = req.query['userName'];

  // Set 5 product as fav
  if (userName === 'existing_orders_user') {
    const orders = ordersData.orders
    res.statusCode = 200;
    res.json({ orders });
  } else {
    res.statusCode = 404;
    res.json({ message: 'No orders found' });
  }
};
