const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset reference is required'],
    },
    allocatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Allocated entity reference is required'],
      refPath: 'allocatedModel',
    },
    allocatedModel: {
      type: String,
      required: [true, 'Allocated entity type is required'],
      enum: ['User', 'Department'],
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Allocating user reference is required'],
    },
    allocationDate: {
      type: Date,
      default: Date.now,
    },
    expectedReturnDate: {
      type: Date,
      default: null,
    },
    actualReturnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Returned', 'Transferred'],
      default: 'Active',
    },
    conditionNotesOnReturn: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for common queries
allocationSchema.index({ asset: 1, status: 1 });
allocationSchema.index({ allocatedTo: 1, status: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);
