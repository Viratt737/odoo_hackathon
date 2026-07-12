const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Resource reference is required'],
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking user reference is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start date and time are required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End date and time are required'],
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of booking is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Indexes to speed up overlap queries
bookingSchema.index({ resource: 1, status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
