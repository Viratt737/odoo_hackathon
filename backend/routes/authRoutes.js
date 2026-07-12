const express = require('express');
const router  = express.Router();

const {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/signup',          signup);
router.post('/login',           login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes (require valid JWT)
router.get('/me',     protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
