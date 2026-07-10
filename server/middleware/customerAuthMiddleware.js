const jwt = require('jsonwebtoken');
const CustomerAccount = require('../models/CustomerAccount');
const { getCustomerJwtSecret } = require('../utils/customerAuthConfig');

const customerAuthMiddleware = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.customerAccessToken) {
      token = req.cookies.customerAccessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, getCustomerJwtSecret());

      if (decoded.type !== 'customer') {
        return res.status(401).json({ message: 'Invalid token type.' });
      }

      const customer = await CustomerAccount.findById(decoded.id).select('-password');

      if (!customer) {
        return res.status(401).json({ message: 'Customer account no longer exists.' });
      }

      if (customer.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended.' });
      }

      if (customer.status === 'inactive') {
        return res.status(403).json({ message: 'Your account is currently inactive.' });
      }

      req.customerUser = customer;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res
          .status(401)
          .json({ code: 'CUSTOMER_TOKEN_EXPIRED', message: 'Token expired.' });
      }
      return res.status(401).json({ message: 'Invalid or malformed token.' });
    }
  } catch (error) {
    console.error('Customer Auth Middleware Error:', error);
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

module.exports = customerAuthMiddleware;
