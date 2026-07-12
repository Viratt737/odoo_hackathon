const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../middleware/auth');

const {
  getAuditCycles,
  getAuditCycle,
  createAuditCycle,
  assignAuditors,
  updateAuditItem,
  getDiscrepancies,
  closeAuditCycle,
} = require('../controllers/auditController');

// All audit routes require authentication
router.use(protect);

router.get('/',               getAuditCycles);
router.get('/:id',           getAuditCycle);
router.get('/:id/discrepancies', getDiscrepancies);

// Auditor actions (checked for cycle assignment in controller)
router.patch('/:cycleId/items/:itemId', updateAuditItem);

// Manager/Admin only routes
router.post('/',                      requireRole('Admin', 'AssetManager'), createAuditCycle);
router.patch('/:id/assign-auditors', requireRole('Admin', 'AssetManager'), assignAuditors);
router.patch('/:id/close',           requireRole('Admin', 'AssetManager'), closeAuditCycle);

module.exports = router;
