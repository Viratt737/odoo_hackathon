const mongoose = require('mongoose');
const { ALL_STATUSES, ALL_CONDITIONS } = require('../utils/assetStateMachine');

// ─── Embedded history entry (lightweight ref) ─────────────────────────────────
const allocationHistorySchema = new mongoose.Schema(
  {
    allocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Allocation' },
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'allocationHistory.allocatedModel' },
    allocatedModel: { type: String, enum: ['User', 'Department'] },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromDate: Date,
    toDate:   Date,
    notes:    String,
  },
  { _id: false, timestamps: false }
);

const maintenanceHistorySchema = new mongoose.Schema(
  {
    request:     { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceRequest' },
    type:        String,
    status:      String,
    scheduledAt: Date,
    completedAt: Date,
    cost:        Number,
    notes:       String,
  },
  { _id: false, timestamps: false }
);

// ─── Main Asset Schema ────────────────────────────────────────────────────────
const assetSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    assetTag: {
      type: String,
      unique: true,
      trim: true,
      // Auto-generated before save — not required from client
    },
    serialNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Classification ────────────────────────────────────────────────────────
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetCategory',
      required: [true, 'Asset category is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ALL_STATUSES,
        message: `Status must be one of: ${ALL_STATUSES.join(', ')}`,
      },
      default: 'Available',
    },
    condition: {
      type: String,
      enum: {
        values: ALL_CONDITIONS,
        message: `Condition must be one of: ${ALL_CONDITIONS.join(', ')}`,
      },
      default: 'Good',
    },

    // ── Acquisition ───────────────────────────────────────────────────────────
    acquisitionDate: {
      type: Date,
      default: null,
    },
    acquisitionCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendor: {
      type: String,
      trim: true,
      default: '',
    },
    warrantyExpiryDate: {
      type: Date,
      default: null,
    },

    // ── Location & Description ────────────────────────────────────────────────
    location: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Category Custom Field Values (key: fieldName → value) ─────────────────
    customFieldValues: {
      type: Map,
      of: String,
      default: {},
    },

    // ── Booking ───────────────────────────────────────────────────────────────
    isBookable: {
      type: Boolean,
      default: false,
    },

    // ── Files ─────────────────────────────────────────────────────────────────
    photos:    { type: [String], default: [] },
    documents: { type: [String], default: [] },

    // ── Maintenance ───────────────────────────────────────────────────────────
    lastMaintenanceDate: { type: Date, default: null },
    nextMaintenanceDate: { type: Date, default: null },

    // ── Embedded History (populated by Phases 5 & 7) ─────────────────────────
    allocationHistory:  { type: [allocationHistorySchema],  default: [] },
    maintenanceHistory: { type: [maintenanceHistorySchema], default: [] },

    // ── Audit ─────────────────────────────────────────────────────────────────
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Indexes for common queries ───────────────────────────────────────────────
assetSchema.index({ assetTag: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ department: 1 });
assetSchema.index({ name: 'text', serialNumber: 'text', assetTag: 'text', location: 'text' });

module.exports = mongoose.model('Asset', assetSchema);
