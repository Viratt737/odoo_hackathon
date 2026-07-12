const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  getResourceBookings,
} = require('../controllers/bookingController');

// All booking routes require authentication
router.use(protect);

router.get('/',                  getBookings);
router.post('/',                 createBooking);
router.get('/:id',               getBooking);
router.patch('/:id',             updateBooking);
router.patch('/:id/cancel',      cancelBooking);
router.get('/resource/:assetId', getResourceBookings);

module.exports = router;
