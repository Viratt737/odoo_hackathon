const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Protect routes — verifies JWT and attaches the user to req.user.
 * Business logic (role checks etc.) will be added in a later phase.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Not authorised — no token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return next(new ApiError(401, 'User not found for this token'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specified roles.
 * Usage: authorise('admin', 'manager')
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role '${req.user.role}' is not permitted to access this resource`)
      );
    }
    next();
  };
};

module.exports = { protect, authorise };
