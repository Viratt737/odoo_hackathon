const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

const {
  getAllocations,
  getOverdueAllocations,
  createAllocation,
  returnAllocation,
  requestTransfer,
  getTransfers,
  approveTransfer,
} = require('../controllers/allocationController');

// All allocation routes require authentication
router.use(protect);

router.get('/',                    getAllocations);
router.get('/overdue',             getOverdueAllocations);
router.post('/',                   createAllocation);
router.patch('/:id/return',        returnAllocation);

// Polymorphic transfers
router.get('/transfers',           getTransfers);
router.post('/transfers',          requestTransfer);
router.patch('/transfers/:id/approve', approveTransfer);

module.exports = router;
