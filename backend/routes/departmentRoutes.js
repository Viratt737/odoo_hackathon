const express = require('express');
const router  = express.Router();

const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
} = require('../controllers/departmentController');

const { protect, requireRole } = require('../middleware/auth');

// All department routes require Admin
router.use(protect, requireRole('Admin'));

router.get('/',    getDepartments);
router.post('/',   createDepartment);
router.get('/:id', getDepartment);
router.put('/:id', updateDepartment);
router.patch('/:id/status', toggleDepartmentStatus);
router.delete('/:id', deleteDepartment);

module.exports = router;
