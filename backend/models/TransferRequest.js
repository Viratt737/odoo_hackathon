const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
    },
    currentAllocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allocation',
      required: [true, 'Current allocation is required'],
    },
    requestedTo: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Transfer target entity is required'],
      refPath: 'requestedToModel',
    },
    requestedToModel: {
      type: String,
      required: [true, 'Transfer target type is required'],
      enum: ['User', 'Department'],
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting user reference is required'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Reallocated', 'Rejected'],
      default: 'Requested',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
