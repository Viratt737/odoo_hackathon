const jwt     = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User     = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// protect — verify JWT, attach req.user
// ─────────────────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Access denied — no token provided'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new ApiError(401, 'Invalid or expired token — please log in again'));
    }

    const user = await User.findById(decoded.id).select(
      '+passwordChangedAt'
    );

    if (!user) {
      return next(new ApiError(401, 'The user belonging to this token no longer exists'));
    }

    // Check if password was changed after the token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return next(new ApiError(401, 'Password was recently changed — please log in again'));
    }

    // Block inactive users on all protected routes
    if (user.status === 'Inactive') {
      return next(new ApiError(403, 'Your account has been deactivated'));
    }

    // Remove sensitive field before attaching to request
    user.passwordChangedAt = undefined;
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// requireRole — restrict to specific roles (use after protect)
// Usage: router.delete('/:id', protect, requireRole('Admin'), deleteUser)
// ─────────────────────────────────────────────────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied — required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
        )
      );
    }
    next();
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// requireStatus — block users by status (use after protect)
// Usage: requireStatus('Active')
// ─────────────────────────────────────────────────────────────────────────────
const requireStatus = (...statuses) => {
  return (req, res, next) => {
    if (!statuses.includes(req.user?.status)) {
      return next(
        new ApiError(403, `Account status '${req.user?.status}' is not permitted here`)
      );
    }
    next();
  };
};

module.exports = { protect, requireRole, requireStatus };
