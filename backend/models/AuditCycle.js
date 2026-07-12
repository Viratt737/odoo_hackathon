const mongoose = require('mongoose');

const auditCycleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Audit cycle title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAuditors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssetCategory',
      },
    ],
    auditItems: [
      {
        asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        auditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        auditedAt: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'verified', 'discrepancy', 'missing'],
          default: 'pending',
        },
        condition: { type: String },
        notes: { type: String },
      },
    ],
    totalAssets: { type: Number, default: 0 },
    verifiedAssets: { type: Number, default: 0 },
    discrepancies: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditCycle', auditCycleSchema);
