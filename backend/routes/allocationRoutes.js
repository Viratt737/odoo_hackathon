const express = require('express');
const router = express.Router();
const { getAllocations, getAllocation, createAllocation, updateAllocation, returnAllocation } = require('../controllers/allocationController');

router.get('/', getAllocations);
router.post('/', createAllocation);
router.get('/:id', getAllocation);
router.put('/:id', updateAllocation);
router.patch('/:id/return', returnAllocation);

module.exports = router;
