const express = require('express');
const router = express.Router();
const { getBookings, getBooking, createBooking, updateBooking, cancelBooking } = require('../controllers/bookingController');

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
