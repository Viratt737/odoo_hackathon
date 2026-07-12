const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const ApiError    = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User        = require('../models/User');

// ─── Helper: sign a JWT ───────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Helper: send token response ─────────────────────────────────────────────
const sendTokenResponse = (res, statusCode, user, message) => {
  const token = signToken(user._id);

  // Strip sensitive fields before sending
  const userPayload = {
    _id:        user._id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    status:     user.status,
    department: user.department,
    avatar:     user.avatar,
    lastLogin:  user.lastLogin,
    createdAt:  user.createdAt,
  };

  res.status(statusCode).json(
    new ApiResponse(statusCode, { token, user: userPayload }, message)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Sign up a new user (Employee role only — no role selection)
// @route   POST /api/auth/signup
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const signup = async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return next(new ApiError(400, 'Name, email, and password are required'));
  }

  if (password !== confirmPassword) {
    return next(new ApiError(400, 'Passwords do not match'));
  }

  if (password.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters'));
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new ApiError(409, 'An account with this email already exists'));
  }

  // Role is ALWAYS Employee at signup — no exceptions
  const user = await User.create({
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    password,
    role:     'Employee',
    status:   'Active',
  });

  sendTokenResponse(res, 201, user, 'Account created successfully');
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Login
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, 'Email and password are required'));
  }

  // Explicitly select password (it's excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  if (user.status === 'Inactive') {
    return next(new ApiError(403, 'Your account has been deactivated. Contact an Administrator.'));
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(res, 200, user, 'Logged in successfully');
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get current logged-in user (session validation)
// @route   GET /api/auth/me
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  // req.user is already attached by the protect middleware
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, 'User fetched successfully')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Forgot password — generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ApiError(400, 'Email is required'));
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond with success to prevent email enumeration attacks
  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, null, 'If an account with that email exists, a reset link has been sent.')
    );
  }

  const rawToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In production this token would be emailed. For now we return it directly.
  // TODO (Phase 5): integrate nodemailer / SendGrid
  res.status(200).json(
    new ApiResponse(
      200,
      {
        resetToken: rawToken,
        expiresIn: '15 minutes',
        message: 'Email service not configured — use the token directly for now',
      },
      'Password reset token generated'
    )
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return next(new ApiError(400, 'Password and confirmPassword are required'));
  }

  if (password !== confirmPassword) {
    return next(new ApiError(400, 'Passwords do not match'));
  }

  if (password.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters'));
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken:   hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires +passwordChangedAt');

  if (!user) {
    return next(new ApiError(400, 'Reset token is invalid or has expired'));
  }

  user.password = password;
  // pre-save hook will clear the reset token fields and hash the password
  await user.save();

  sendTokenResponse(res, 200, user, 'Password reset successfully');
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Logout (client-side token removal; endpoint for logging purposes)
// @route   POST /api/auth/logout
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
};

module.exports = { signup, login, getMe, forgotPassword, resetPassword, logout };
