import { isValidUser, isValidPassword, isLockedUser } from '../../src/constants/users';

/**
 * @swagger
 * /api/signin:
 *   post:
 *     description: Authenticate and sign in the user.
 *     requestBody:
 *        description: Sign in credentials that you want to authenticate.
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                userName:
 *                  type: string
 *                password:
 *                  type: string
 *     responses:
 *       200:
 *         description: Successful signin
 *       422:
 *         description: User credentials cannot be processed. Check if the credentials are incorrect or if your account is locked.
 */
export default (req, res) => {
  const userName = req.body['userName'];
  const password = req.body['password'];
  if (isValidUser(userName) && isValidPassword(password)) {
    res.statusCode = 200;
    res.json({});
  } else {
    let errorMessage = '';
    if (!isValidUser(userName)) {
      errorMessage = 'Invalid Username';
    } else if (!isValidPassword(password)) {
      errorMessage = 'Invalid Password';
    } else {
      errorMessage = 'Something went wrong';
    }

    if (isLockedUser(userName)) {
      errorMessage = 'Your account has been locked.'
    }

    res.statusCode = 422;
    res.json({ errorMessage });
  }
};
