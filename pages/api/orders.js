import ordersData from '../../src/constants/orders.json';

/**
 * @swagger
 * /api/orders:
 *   get:
 *     description: Returns all orders associated with the logged in user.
 *     parameters:
 *     - in: query
 *       name: userName
 *       required: false
 *       description:  Name of the signed in user. If the user name is set to existing_orders_user, the response returns all orders.
 *     responses:
 *       200:
 *         description: List of all orders.
 *       404:
 *         description: No orders found
 */
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
