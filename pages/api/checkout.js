import { isValidUser } from '../../src/constants/users';

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
