const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req,res,next) =>{
  console.log(req.body);
  try {
    const token = req.header('Authorization').replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.SALT)
    const user = await User.getUser({_id: decoded._id});
    if (!user) {
      console.log(1235);
      throw new Error()
    }
    req.token = token;
    req.user = user;
    next()
    
  } catch (e) {
    res.status(401).send({error: 'Please authenticate'})
  }
}

module.exports = auth