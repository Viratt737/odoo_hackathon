const MaintenanceRequest = require('../models/MaintenanceRequest');
const Asset              = require('../models/Asset');
const ApiError           = require('../utils/ApiError');
const ApiResponse        = require('../utils/ApiResponse');
const { validateTransition } = require('../utils/assetStateMachine');

// Helper: build photo file URL
const fileUrl = (file) => `/uploads/photos/${file.filename}`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/maintenance
// Query: status, priority, asset
// ─────────────────────────────────────────────────────────────────────────────
const getRequests = async (req, res) => {
  const { status, priority, asset } = req.query;
  const filter = {};
  if (status)   filter.status = status;
  if (priority) filter.priority = priority;
  if (asset)    filter.asset = asset;

  const requests = await MaintenanceRequest.find(filter)
    .populate('asset', 'name assetTag status location')
    .populate('raisedBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { requests }, 'Requests fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/maintenance/:id
// ─────────────────────────────────────────────────────────────────────────────
const getRequest = async (req, res, next) => {
  const request = await MaintenanceRequest.findById(req.params.id)
    .populate('asset', 'name assetTag status location photos')
    .populate('raisedBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!request) return next(new ApiError(404, 'Maintenance request not found'));
  res.status(200).json(new ApiResponse(200, { request }, 'Request fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/maintenance (Raise request)
// ─────────────────────────────────────────────────────────────────────────────
const createRequest = async (req, res, next) => {
  const { asset: assetId, issueDescription, priority } = req.body;

  if (!assetId || !issueDescription) {
    return next(new ApiError(400, 'Asset ID and issue description are required'));
  }

  const asset = await Asset.findById(assetId);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // Ensure asset is not Retired or Disposed
  if (['Retired', 'Disposed'].includes(asset.status)) {
    return next(new ApiError(400, `Cannot request maintenance for a ${asset.status.toLowerCase()} asset`));
  }

  const attachedPhoto = req.file ? fileUrl(req.file) : null;

  const request = await MaintenanceRequest.create({
    asset:            assetId,
    raisedBy:         req.user._id,
    issueDescription: issueDescription.trim(),
    priority:         priority || 'Medium',
    attachedPhoto,
    status:           'Pending',
  });

  res.status(201).json(new ApiResponse(201, { request }, 'Maintenance request raised successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/maintenance/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
const approveRequest = async (req, res, next) => {
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new ApiError(404, 'Request not found'));

  if (request.status !== 'Pending') {
    return next(new ApiError(400, `Request is already ${request.status}`));
  }

  const asset = await Asset.findById(request.asset);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // Validate state transition (Available/Allocated -> Under Maintenance)
  try {
    validateTransition(asset.status, 'UnderMaintenance');
  } catch (err) {
    return next(err);
  }

  // Update Request status
  request.status = 'Approved';
  request.approvedBy = req.user._id;
  await request.save();

  // Update Asset status
  asset.status = 'UnderMaintenance';

  // Append history
  asset.maintenanceHistory.push({
    request:     request._id,
    type:        `${request.priority} Priority Corrective`,
    status:      'Approved',
    scheduledAt: new Date(),
    notes:       request.issueDescription,
  });
  await asset.save();

  res.status(200).json(new ApiResponse(200, { request }, 'Maintenance request approved and asset placed under maintenance'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/maintenance/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
const rejectRequest = async (req, res, next) => {
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new ApiError(404, 'Request not found'));

  if (request.status !== 'Pending') {
    return next(new ApiError(400, `Request is already ${request.status}`));
  }

  request.status = 'Rejected';
  request.approvedBy = req.user._id;
  await request.save();

  res.status(200).json(new ApiResponse(200, { request }, 'Maintenance request rejected'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/maintenance/:id/assign-technician
// ─────────────────────────────────────────────────────────────────────────────
const assignTechnician = async (req, res, next) => {
  const { technician } = req.body;
  if (!technician?.trim()) {
    return next(new ApiError(400, 'Technician name is required'));
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new ApiError(404, 'Request not found'));

  if (request.status !== 'Approved') {
    return next(new ApiError(400, `Technician can only be assigned to approved requests. Current status: ${request.status}`));
  }

  request.status = 'TechnicianAssigned';
  request.assignedTechnician = technician.trim();
  await request.save();

  // Update asset history note
  const asset = await Asset.findById(request.asset);
  if (asset) {
    const entry = asset.maintenanceHistory.find((m) => m.request?.toString() === request._id.toString());
    if (entry) {
      entry.status = 'TechnicianAssigned';
      entry.notes = `${entry.notes || ''} [Technician: ${technician}]`.trim();
      await asset.save();
    }
  }

  res.status(200).json(new ApiResponse(200, { request }, 'Technician assigned successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/maintenance/:id/start
// ─────────────────────────────────────────────────────────────────────────────
const startMaintenance = async (req, res, next) => {
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new ApiError(404, 'Request not found'));

  if (request.status !== 'TechnicianAssigned') {
    return next(new ApiError(400, `Maintenance can only start after technician assignment. Current: ${request.status}`));
  }

  request.status = 'InProgress';
  await request.save();

  // Update asset history
  const asset = await Asset.findById(request.asset);
  if (asset) {
    const entry = asset.maintenanceHistory.find((m) => m.request?.toString() === request._id.toString());
    if (entry) {
      entry.status = 'InProgress';
      await asset.save();
    }
  }

  res.status(200).json(new ApiResponse(200, { request }, 'Maintenance started (In Progress)'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/maintenance/:id/resolve
// ─────────────────────────────────────────────────────────────────────────────
const resolveMaintenance = async (req, res, next) => {
  const { resolutionNotes, cost } = req.body;

  if (!resolutionNotes?.trim()) {
    return next(new ApiError(400, 'Resolution notes are required to resolve'));
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new ApiError(404, 'Request not found'));

  if (request.status !== 'InProgress') {
    return next(new ApiError(400, `Only in-progress maintenance can be resolved. Current: ${request.status}`));
  }

  const asset = await Asset.findById(request.asset);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // Validate transition from Under Maintenance to Available
  try {
    validateTransition(asset.status, 'Available');
  } catch (err) {
    return next(err);
  }

  // Update request
  request.status = 'Resolved';
  request.resolvedAt = new Date();
  request.resolutionNotes = resolutionNotes.trim();
  request.cost = cost ? Number(cost) : 0;
  await request.save();

  // Update asset
  asset.status = 'Available';
  asset.lastMaintenanceDate = new Date();

  // Close history entry
  const entry = asset.maintenanceHistory.find((m) => m.request?.toString() === request._id.toString());
  if (entry) {
    entry.status = 'Completed';
    entry.completedAt = new Date();
    entry.cost = request.cost;
    entry.notes = `${entry.notes || ''} [Resolution: ${resolutionNotes.trim()}]`.trim();
  }
  await asset.save();

  res.status(200).json(new ApiResponse(200, { request }, 'Maintenance resolved successfully and asset set to available'));
};

module.exports = {
  getRequests,
  getRequest,
  createRequest,
  approveRequest,
  rejectRequest,
  assignTechnician,
  startMaintenance,
  resolveMaintenance,
};
