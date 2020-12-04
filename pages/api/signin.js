import { isValidUser, isValidPassword, isLockedUser } from '../../src/constants/users';

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
