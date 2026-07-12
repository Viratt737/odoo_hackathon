const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { uploadMaintenancePhoto } = require('../middleware/upload');

const {
  getRequests,
  getRequest,
  createRequest,
  approveRequest,
  rejectRequest,
  assignTechnician,
  startMaintenance,
  resolveMaintenance,
} = require('../controllers/maintenanceController');

// All maintenance routes require authentication
router.use(protect);

router.get('/',  getRequests);
router.get('/:id', getRequest);

// Raise request (any user)
router.post('/', uploadMaintenancePhoto, createRequest);

// Workflow state changes (Admin & AssetManager only)
router.patch('/:id/approve',           requireRole('Admin', 'AssetManager'), approveRequest);
router.patch('/:id/reject',            requireRole('Admin', 'AssetManager'), rejectRequest);
router.patch('/:id/assign-technician', requireRole('Admin', 'AssetManager'), assignTechnician);
router.patch('/:id/resolve',           requireRole('Admin', 'AssetManager'), resolveMaintenance);

// Progressing work status (Can be done by anyone who accesses the request, e.g. technician or manager)
router.patch('/:id/start',             startMaintenance);

module.exports = router;
