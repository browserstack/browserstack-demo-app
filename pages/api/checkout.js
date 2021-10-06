import { isValidUser } from '../../src/constants/users';

/**
 * @swagger
 * /api/checkout:
 *   get:
 *     description: Validate if the logged in user is allowed to checkout products.
 *     parameters:
 *     - in: query
 *       name: userName
 *       required: false
 *       description:  Name of the signed in user.
 *     responses:
 *       200:
 *         description: userName is valid.
 *       422:
 *         description: userName is invalid.
 */
export default (req, res) => {
  const userName = req.body['userName'];
  if (isValidUser(userName)) {
    res.statusCode = 200;
    res.json({});
  } else {
    res.statusCode = 422;
    res.json({ });
  }
};
