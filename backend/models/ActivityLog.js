const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    module: {
      type: String,
      enum: [
        'auth',
        'user',
        'department',
        'asset_category',
        'asset',
        'allocation',
        'booking',
        'maintenance',
        'audit',
        'notification',
        'system',
      ],
      required: [true, 'Module is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    // Polymorphic reference to the affected document
    targetModel: {
      type: String,
      enum: ['User', 'Department', 'AssetCategory', 'Asset', 'Allocation', 'Booking', 'MaintenanceRequest', 'AuditCycle'],
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    // Activity logs are append-only; disable update operators at schema level
    strict: true,
  }
);

// TTL index — auto-delete logs older than 1 year (optional, can be removed)
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
