const express = require('express');
const router = express.Router();
const { getRequests, getRequest, createRequest, updateRequest, closeRequest } = require('../controllers/maintenanceController');

router.get('/', getRequests);
router.post('/', createRequest);
router.get('/:id', getRequest);
router.put('/:id', updateRequest);
router.patch('/:id/close', closeRequest);

module.exports = router;
