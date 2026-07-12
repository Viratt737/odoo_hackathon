const mongoose = require('mongoose');

const auditItemSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset reference is required'],
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    result: {
      type: String,
      enum: ['Verified', 'Missing', 'Damaged', 'Pending'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

const auditCycleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Audit cycle title is required'],
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    dateRangeStart: {
      type: Date,
      required: [true, 'Date range start is required'],
    },
    dateRangeEnd: {
      type: Date,
      required: [true, 'Date range end is required'],
    },
    assignedAuditors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    auditItems: [auditItemSchema],
  },
  { timestamps: true }
);

// Indexes
auditCycleSchema.index({ status: 1 });
auditCycleSchema.index({ 'auditItems.asset': 1 });

module.exports = mongoose.model('AuditCycle', auditCycleSchema);
