const Booking    = require('../models/Booking');
const Asset      = require('../models/Asset');
const ApiError   = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ─── Status Auto-Sync Helper ─────────────────────────────────────────────────
const syncBookingStatuses = async () => {
  const now = new Date();
  
  // 1. Move Upcoming -> Ongoing if startTime <= now and status is Upcoming
  await Booking.updateMany(
    { status: 'Upcoming', startTime: { $lte: now } },
    { $set: { status: 'Ongoing' } }
  );

  // 2. Move Upcoming or Ongoing -> Completed if endTime <= now and status is Upcoming/Ongoing
  await Booking.updateMany(
    { status: { $in: ['Upcoming', 'Ongoing'] }, endTime: { $lte: now } },
    { $set: { status: 'Completed' } }
  );
};

// ─── Overlap Check Helper ────────────────────────────────────────────────────
const checkOverlap = async (resourceId, newStart, newEnd, excludeBookingId = null) => {
  const query = {
    resource: resourceId,
    status: { $ne: 'Cancelled' },
    startTime: { $lt: newEnd },
    endTime: { $gt: newStart },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return await Booking.findOne(query).populate('bookedBy', 'name email');
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings
// ─────────────────────────────────────────────────────────────────────────────
const getBookings = async (req, res) => {
  await syncBookingStatuses();

  const isManager = ['Admin', 'AssetManager'].includes(req.user.role);
  const filter = {};
  
  if (!isManager) {
    filter.bookedBy = req.user._id;
  }

  const bookings = await Booking.find(filter)
    .populate('resource', 'name assetTag location photos')
    .populate('bookedBy', 'name email')
    .sort({ startTime: -1 });

  res.status(200).json(new ApiResponse(200, { bookings }, 'Bookings fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id
// ─────────────────────────────────────────────────────────────────────────────
const getBooking = async (req, res, next) => {
  await syncBookingStatuses();

  const booking = await Booking.findById(req.params.id)
    .populate('resource', 'name assetTag location photos')
    .populate('bookedBy', 'name email');

  if (!booking) return next(new ApiError(404, 'Booking not found'));

  const isManager = ['Admin', 'AssetManager'].includes(req.user.role);
  const isOwner   = booking.bookedBy._id.toString() === req.user._id.toString();

  if (!isManager && !isOwner) {
    return next(new ApiError(403, 'You do not have permission to view this booking'));
  }

  res.status(200).json(new ApiResponse(200, { booking }, 'Booking fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
// ─────────────────────────────────────────────────────────────────────────────
const createBooking = async (req, res, next) => {
  const { resource: resourceId, startTime, endTime, purpose, notes } = req.body;

  if (!resourceId || !startTime || !endTime || !purpose) {
    return next(new ApiError(400, 'Resource, startTime, endTime, and purpose are required'));
  }

  const start = new Date(startTime);
  const end   = new Date(endTime);

  if (start >= end) {
    return next(new ApiError(400, 'Start time must be before end time'));
  }

  const asset = await Asset.findById(resourceId);
  if (!asset) return next(new ApiError(404, 'Resource not found'));

  // Ensure asset is bookable
  if (!asset.isBookable) {
    return next(new ApiError(400, `Asset '${asset.name}' is not marked as bookable`));
  }

  // Check status (Retired or Disposed cannot be booked)
  if (['Retired', 'Disposed'].includes(asset.status)) {
    return next(new ApiError(400, `Cannot book resource with status '${asset.status}'`));
  }

  // Run overlap validation
  const conflict = await checkOverlap(resourceId, start, end);
  if (conflict) {
    const formattedStart = new Date(conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEnd   = new Date(conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return res.status(409).json({
      success: false,
      message: `Time slot conflict: Overlaps with booking by ${conflict.bookedBy?.name || 'another employee'} (${formattedStart} - ${formattedEnd}).`,
      conflictDetails: {
        holder: conflict.bookedBy?.name,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      }
    });
  }

  // Set initial status based on current time
  const now = new Date();
  let status = 'Upcoming';
  if (start <= now && end > now) status = 'Ongoing';
  if (end <= now)                status = 'Completed';

  const booking = await Booking.create({
    resource: resourceId,
    bookedBy: req.user._id,
    startTime: start,
    endTime:   end,
    purpose:   purpose.trim(),
    notes:     notes?.trim() || '',
    status,
  });

  await booking.populate('resource');

  res.status(201).json(new ApiResponse(201, { booking }, 'Booking created successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id (Reschedule)
// ─────────────────────────────────────────────────────────────────────────────
const updateBooking = async (req, res, next) => {
  const { startTime, endTime, purpose, notes } = req.body;
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) return next(new ApiError(404, 'Booking not found'));

  // Auth check
  const isManager = ['Admin', 'AssetManager'].includes(req.user.role);
  const isOwner   = booking.bookedBy.toString() === req.user._id.toString();
  if (!isManager && !isOwner) {
    return next(new ApiError(403, 'You do not have permission to modify this booking'));
  }

  // Cannot modify if completed/cancelled
  await syncBookingStatuses();
  const currentBooking = await Booking.findById(id); // Reload updated status
  if (['Completed', 'Cancelled'].includes(currentBooking.status)) {
    return next(new ApiError(400, `Cannot modify a booking that is ${currentBooking.status.toLowerCase()}`));
  }

  const start = startTime ? new Date(startTime) : new Date(booking.startTime);
  const end   = endTime ? new Date(endTime) : new Date(booking.endTime);

  if (start >= end) {
    return next(new ApiError(400, 'Start time must be before end time'));
  }

  // If time changed, recheck overlap (excluding this booking)
  if (startTime || endTime) {
    const conflict = await checkOverlap(booking.resource, start, end, booking._id);
    if (conflict) {
      const formattedStart = new Date(conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedEnd   = new Date(conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(409).json({
        success: false,
        message: `Conflict: Slot overlaps with existing booking by ${conflict.bookedBy?.name || 'another employee'} (${formattedStart} - ${formattedEnd}).`,
      });
    }
  }

  if (startTime) booking.startTime = start;
  if (endTime)   booking.endTime   = end;
  if (purpose)   booking.purpose   = purpose.trim();
  if (notes !== undefined) booking.notes = notes.trim();

  // Sync status
  const now = new Date();
  if (booking.startTime > now) {
    booking.status = 'Upcoming';
  } else if (booking.startTime <= now && booking.endTime > now) {
    booking.status = 'Ongoing';
  } else {
    booking.status = 'Completed';
  }

  await booking.save();
  await booking.populate('resource');

  res.status(200).json(new ApiResponse(200, { booking }, 'Booking rescheduled successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
const cancelBooking = async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) return next(new ApiError(404, 'Booking not found'));

  // Auth check
  const isManager = ['Admin', 'AssetManager'].includes(req.user.role);
  const isOwner   = booking.bookedBy.toString() === req.user._id.toString();
  if (!isManager && !isOwner) {
    return next(new ApiError(403, 'You do not have permission to cancel this booking'));
  }

  await syncBookingStatuses();
  const currentBooking = await Booking.findById(id); // Reload updated status
  if (currentBooking.status === 'Cancelled') {
    return next(new ApiError(400, 'Booking is already cancelled'));
  }
  if (currentBooking.status === 'Completed') {
    return next(new ApiError(400, 'Cannot cancel a completed booking'));
  }

  currentBooking.status = 'Cancelled';
  await currentBooking.save();

  res.status(200).json(new ApiResponse(200, { booking: currentBooking }, 'Booking cancelled successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/resource/:assetId
// ─────────────────────────────────────────────────────────────────────────────
const getResourceBookings = async (req, res) => {
  await syncBookingStatuses();

  const bookings = await Booking.find({
    resource: req.params.assetId,
    status: { $ne: 'Cancelled' },
  })
    .populate('bookedBy', 'name email')
    .sort({ startTime: 1 });

  res.status(200).json(new ApiResponse(200, { bookings }, 'Resource bookings fetched'));
};

module.exports = {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  getResourceBookings,
};
