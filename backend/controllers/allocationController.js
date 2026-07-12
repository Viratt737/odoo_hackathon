const mongoose = require('mongoose');
const Allocation      = require('../models/Allocation');
const Asset           = require('../models/Asset');
const User            = require('../models/User');
const Department      = require('../models/Department');
const TransferRequest = require('../models/TransferRequest');
const ApiError        = require('../utils/ApiError');
const ApiResponse     = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/allocations
// Query: status, asset, allocatedTo, page, limit
// ─────────────────────────────────────────────────────────────────────────────
const getAllocations = async (req, res) => {
  const { status, asset, allocatedTo, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status)      filter.status = status;
  if (asset)       filter.asset  = asset;
  if (allocatedTo) filter.allocatedTo = allocatedTo;

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Allocation.countDocuments(filter);

  const allocations = await Allocation.find(filter)
    .populate('asset', 'name assetTag status')
    .populate('allocatedTo') // dynamic populates based on allocatedModel
    .populate('allocatedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Manually filter populated polymorphic fields if Mongoose didn't resolve correctly
  // (In newer Mongoose, polymorphic populate works nicely)
  res.status(200).json(
    new ApiResponse(200, { allocations, total, page: Number(page), limit: Number(limit) }, 'Allocations fetched')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/allocations/overdue
// ─────────────────────────────────────────────────────────────────────────────
const getOverdueAllocations = async (req, res) => {
  const now = new Date();
  const overdue = await Allocation.find({
    status: 'Active',
    expectedReturnDate: { $ne: null, $lt: now },
  })
    .populate('asset', 'name assetTag status location')
    .populate('allocatedTo')
    .populate('allocatedBy', 'name email')
    .sort({ expectedReturnDate: 1 });

  res.status(200).json(new ApiResponse(200, { overdue }, 'Overdue allocations fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/allocations (Allocate asset)
// ─────────────────────────────────────────────────────────────────────────────
const createAllocation = async (req, res, next) => {
  const { asset: assetId, allocatedTo, allocatedModel, expectedReturnDate, notes } = req.body;

  if (!assetId || !allocatedTo || !allocatedModel) {
    return next(new ApiError(400, 'Asset, allocatedTo, and allocatedModel are required'));
  }

  const asset = await Asset.findById(assetId);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // CRITICAL: Double-allocation check
  if (asset.status === 'Allocated') {
    // Find the current active allocation to show holder name
    const activeAlloc = await Allocation.findOne({ asset: assetId, status: 'Active' })
      .populate('allocatedTo', 'name');
    
    let holderName = 'Unknown';
    if (activeAlloc && activeAlloc.allocatedTo) {
      holderName = activeAlloc.allocatedTo.name || 'Department';
    }

    return res.status(409).json({
      success: false,
      message: `Conflict: Asset is already allocated and currently held by ${holderName}.`,
      holderName,
      activeAllocationId: activeAlloc?._id || null,
    });
  }

  // Create allocation
  const allocation = await Allocation.create({
    asset:          assetId,
    allocatedTo,
    allocatedModel,
    allocatedBy:    req.user._id,
    expectedReturnDate: expectedReturnDate || null,
    notes:          notes || '',
    status:         'Active',
  });

  // Update Asset
  asset.status = 'Allocated';
  if (allocatedModel === 'Department') {
    asset.department = allocatedTo;
  } else {
    // If allocated to a User, check if user has a department to sync
    const user = await User.findById(allocatedTo);
    if (user && user.department) {
      asset.department = user.department;
    }
  }

  // Append history
  asset.allocationHistory.push({
    allocation:     allocation._id,
    allocatedTo,
    allocatedModel,
    allocatedBy:    req.user._id,
    fromDate:       allocation.allocationDate,
    notes:          notes || '',
  });

  await asset.save();

  res.status(201).json(new ApiResponse(201, { allocation }, 'Asset allocated successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/allocations/:id/return (Return flow)
// ─────────────────────────────────────────────────────────────────────────────
const returnAllocation = async (req, res, next) => {
  const { id } = req.params;
  const { conditionNotesOnReturn } = req.body;

  const allocation = await Allocation.findById(id);
  if (!allocation) return next(new ApiError(404, 'Allocation not found'));
  if (allocation.status !== 'Active') {
    return next(new ApiError(400, `Allocation is already closed (Status: ${allocation.status})`));
  }

  allocation.status = 'Returned';
  allocation.actualReturnDate = new Date();
  allocation.conditionNotesOnReturn = conditionNotesOnReturn || '';
  await allocation.save();

  // Reset asset status to Available
  const asset = await Asset.findById(allocation.asset);
  if (asset) {
    asset.status = 'Available';
    
    // Find the current entry in history and close it
    const historyEntry = asset.allocationHistory.find(
      (h) => h.allocation && h.allocation.toString() === id
    );
    if (historyEntry) {
      historyEntry.toDate = new Date();
      if (conditionNotesOnReturn) {
        historyEntry.notes = `${historyEntry.notes || ''} [Returned Notes: ${conditionNotesOnReturn}]`.trim();
      }
    }
    await asset.save();
  }

  res.status(200).json(new ApiResponse(200, { allocation }, 'Asset returned successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/allocations/transfers (Request transfer)
// ─────────────────────────────────────────────────────────────────────────────
const requestTransfer = async (req, res, next) => {
  const { assetId, requestedTo, requestedToModel, notes } = req.body;

  if (!assetId || !requestedTo || !requestedToModel) {
    return next(new ApiError(400, 'Asset, requestedTo, and requestedToModel are required'));
  }

  const asset = await Asset.findById(assetId);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // Make sure it is currently allocated
  if (asset.status !== 'Allocated') {
    return next(new ApiError(400, 'Cannot request transfer for an unallocated asset. Please allocate directly.'));
  }

  // Find active allocation
  const currentAllocation = await Allocation.findOne({ asset: assetId, status: 'Active' });
  if (!currentAllocation) {
    return next(new ApiError(404, 'No active allocation found for this asset'));
  }

  const transfer = await TransferRequest.create({
    asset:             assetId,
    currentAllocation: currentAllocation._id,
    requestedTo,
    requestedToModel,
    requestedBy:       req.user._id,
    status:            'Requested',
    notes:             notes || '',
  });

  res.status(201).json(new ApiResponse(201, { transfer }, 'Transfer request created successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/allocations/transfers (List transfers)
// ─────────────────────────────────────────────────────────────────────────────
const getTransfers = async (req, res) => {
  const transfers = await TransferRequest.find()
    .populate('asset', 'name assetTag status')
    .populate('currentAllocation')
    .populate('requestedTo') // dynamic polymorphic populate
    .populate('requestedBy', 'name email');

  res.status(200).json(new ApiResponse(200, { transfers }, 'Transfer requests fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/allocations/transfers/:id/approve (Approve/Reject transfer)
// ─────────────────────────────────────────────────────────────────────────────
const approveTransfer = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body; // 'Approve' or 'Reject'

  if (!['Approve', 'Reject'].includes(action)) {
    return next(new ApiError(400, "Action must be either 'Approve' or 'Reject'"));
  }

  const transfer = await TransferRequest.findById(id)
    .populate('currentAllocation');

  if (!transfer) return next(new ApiError(404, 'Transfer request not found'));
  if (transfer.status !== 'Requested') {
    return next(new ApiError(400, `Transfer request is already ${transfer.status}`));
  }

  // Auth check: only Admin, AssetManager, or relevant Department Head can approve
  const isAuthorized = async () => {
    if (['Admin', 'AssetManager'].includes(req.user.role)) return true;

    if (req.user.role === 'DepartmentHead') {
      // Check if user is Department Head of current allocation entity
      const currentAlloc = transfer.currentAllocation;
      if (currentAlloc.allocatedModel === 'Department') {
        if (currentAlloc.allocatedTo.toString() === req.user.department?.toString()) {
          return true;
        }
      } else {
        const currentUser = await User.findById(currentAlloc.allocatedTo);
        if (currentUser && currentUser.department?.toString() === req.user.department?.toString()) {
          return true;
        }
      }

      // Check if user is Department Head of target transfer entity
      if (transfer.requestedToModel === 'Department') {
        if (transfer.requestedTo.toString() === req.user.department?.toString()) {
          return true;
        }
      } else {
        const targetUser = await User.findById(transfer.requestedTo);
        if (targetUser && targetUser.department?.toString() === req.user.department?.toString()) {
          return true;
        }
      }
    }
    return false;
  };

  const auth = await isAuthorized();
  if (!auth) {
    return next(new ApiError(403, 'Access denied: Only Asset Managers or relevant Department Heads can approve this transfer.'));
  }

  if (action === 'Reject') {
    transfer.status = 'Rejected';
    transfer.approvedBy = req.user._id;
    await transfer.save();
    return res.status(200).json(new ApiResponse(200, { transfer }, 'Transfer request rejected'));
  }

  // Action is Approve -> Reallocate
  // 1. Close current allocation
  const oldAlloc = await Allocation.findById(transfer.currentAllocation._id);
  if (oldAlloc) {
    oldAlloc.status = 'Transferred';
    oldAlloc.actualReturnDate = new Date();
    oldAlloc.conditionNotesOnReturn = `Transferred via request ID: ${transfer._id}`;
    await oldAlloc.save();
  }

  // 2. Create new allocation
  const newAlloc = await Allocation.create({
    asset:          transfer.asset,
    allocatedTo:    transfer.requestedTo,
    allocatedModel: transfer.requestedToModel,
    allocatedBy:    req.user._id,
    notes:          `Transferred from previous holder. Request notes: ${transfer.notes}`,
    status:         'Active',
  });

  // 3. Update Asset
  const asset = await Asset.findById(transfer.asset);
  if (asset) {
    asset.status = 'Allocated';
    if (transfer.requestedToModel === 'Department') {
      asset.department = transfer.requestedTo;
    } else {
      const user = await User.findById(transfer.requestedTo);
      if (user && user.department) {
        asset.department = user.department;
      }
    }

    // Set old allocation toDate in history
    const oldEntry = asset.allocationHistory.find(
      (h) => h.allocation && h.allocation.toString() === transfer.currentAllocation._id.toString()
    );
    if (oldEntry) {
      oldEntry.toDate = new Date();
    }

    // Append new history
    asset.allocationHistory.push({
      allocation:     newAlloc._id,
      allocatedTo:    transfer.requestedTo,
      allocatedModel: transfer.requestedToModel,
      allocatedBy:    req.user._id,
      fromDate:       newAlloc.allocationDate,
      notes:          `Reallocated via transfer request`,
    });

    await asset.save();
  }

  // 4. Update request status to Reallocated
  transfer.status = 'Reallocated';
  transfer.approvedBy = req.user._id;
  await transfer.save();

  res.status(200).json(new ApiResponse(200, { transfer }, 'Transfer request approved and reallocated successfully'));
};

module.exports = {
  getAllocations,
  getOverdueAllocations,
  createAllocation,
  returnAllocation,
  requestTransfer,
  getTransfers,
  approveTransfer,
};
