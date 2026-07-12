const express = require('express');
const router = express.Router();
const { getAuditCycles, getAuditCycle, createAuditCycle, updateAuditCycle } = require('../controllers/auditController');

router.get('/', getAuditCycles);
router.post('/', createAuditCycle);
router.get('/:id', getAuditCycle);
router.put('/:id', updateAuditCycle);

module.exports = router;
