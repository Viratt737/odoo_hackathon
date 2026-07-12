const express = require('express');
const router  = express.Router();

const {
  getUsers,
  getUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} = require('../controllers/userController');

const { protect, requireRole } = require('../middleware/auth');

// All user management routes require Admin + valid JWT
router.use(protect, requireRole('Admin'));

router.get('/',    getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.patch('/:id/role',   updateUserRole);    // Admin-only role promotion
router.patch('/:id/status', updateUserStatus);  // Admin-only activate/deactivate
router.delete('/:id', deleteUser);

module.exports = router;
