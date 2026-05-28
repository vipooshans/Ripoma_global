const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ripoma_access_secret_key_12345');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User no longer exists.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended.' });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({ message: 'Your account is inactive.' });
      }

      req.user = user;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid or malformed token.' });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = authMiddleware;
