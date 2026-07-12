const AuditCycle = require('../models/AuditCycle');
const Asset      = require('../models/Asset');
const ApiError   = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { validateTransition } = require('../utils/assetStateMachine');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audits
// ─────────────────────────────────────────────────────────────────────────────
const getAuditCycles = async (req, res) => {
  const cycles = await AuditCycle.find()
    .populate('department', 'name code')
    .populate('assignedAuditors', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { cycles }, 'Audit cycles fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audits/:id
// ─────────────────────────────────────────────────────────────────────────────
const getAuditCycle = async (req, res, next) => {
  const cycle = await AuditCycle.findById(req.params.id)
    .populate('department', 'name code')
    .populate('assignedAuditors', 'name email')
    .populate('createdBy', 'name email')
    .populate('auditItems.asset', 'name assetTag serialNumber status location')
    .populate('auditItems.auditor', 'name email');

  if (!cycle) return next(new ApiError(404, 'Audit cycle not found'));
  res.status(200).json(new ApiResponse(200, { cycle }, 'Audit cycle fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/audits (Create audit cycle & auto-populate items)
// ─────────────────────────────────────────────────────────────────────────────
const createAuditCycle = async (req, res, next) => {
  const { title, department, location, dateRangeStart, dateRangeEnd, assignedAuditors } = req.body;

  if (!title || !dateRangeStart || !dateRangeEnd) {
    return next(new ApiError(400, 'Title, dateRangeStart, and dateRangeEnd are required'));
  }

  // Build filter for scoping assets
  const assetFilter = {
    status: { $nin: ['Retired', 'Disposed'] },
  };

  if (department) {
    assetFilter.department = department;
  }
  if (location) {
    assetFilter.location = { $regex: location, $options: 'i' };
  }

  // Find all assets in scope
  const assets = await Asset.find(assetFilter);

  // Map to pending audit items
  const auditItems = assets.map((asset) => ({
    asset: asset._id,
    result: 'Pending',
    notes: '',
  }));

  const cycle = await AuditCycle.create({
    title:            title.trim(),
    department:       department || null,
    location:         location?.trim() || '',
    dateRangeStart:   new Date(dateRangeStart),
    dateRangeEnd:     new Date(dateRangeEnd),
    assignedAuditors: assignedAuditors || [],
    createdBy:        req.user._id,
    status:           'Open',
    auditItems,
  });

  res.status(201).json(new ApiResponse(201, { cycle, assetsCount: assets.length }, 'Audit cycle created and items populated'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/audits/:id/assign-auditors
// ─────────────────────────────────────────────────────────────────────────────
const assignAuditors = async (req, res, next) => {
  const { auditors } = req.body;

  if (!Array.isArray(auditors)) {
    return next(new ApiError(400, 'Auditors must be an array of IDs'));
  }

  const cycle = await AuditCycle.findById(req.params.id);
  if (!cycle) return next(new ApiError(404, 'Audit cycle not found'));

  if (cycle.status !== 'Open') {
    return next(new ApiError(400, 'Cannot assign auditors to a closed audit cycle'));
  }

  cycle.assignedAuditors = auditors;
  await cycle.save();

  res.status(200).json(new ApiResponse(200, { cycle }, 'Auditors assigned successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/audits/:cycleId/items/:itemId (Auditor inputs results)
// ─────────────────────────────────────────────────────────────────────────────
const updateAuditItem = async (req, res, next) => {
  const { cycleId, itemId } = req.params;
  const { result, notes }   = req.body;

  if (!['Verified', 'Missing', 'Damaged', 'Pending'].includes(result)) {
    return next(new ApiError(400, 'Invalid verification result'));
  }

  const cycle = await AuditCycle.findById(cycleId);
  if (!cycle) return next(new ApiError(404, 'Audit cycle not found'));

  if (cycle.status !== 'Open') {
    return next(new ApiError(400, 'Audit cycle is closed and locked for modifications'));
  }

  // Authorization check: User must be Admin, AssetManager, or assigned as auditor
  const isManager = ['Admin', 'AssetManager'].includes(req.user.role);
  const isAssigned = cycle.assignedAuditors.some((a) => a.toString() === req.user._id.toString());

  if (!isManager && !isAssigned) {
    return next(new ApiError(403, 'Access denied: You are not assigned to audit this cycle'));
  }

  // Locate the nested item
  const item = cycle.auditItems.id(itemId);
  if (!item) return next(new ApiError(404, 'Audit item not found'));

  item.result   = result;
  item.notes    = notes?.trim() || '';
  item.auditor  = req.user._id;

  await cycle.save();

  res.status(200).json(new ApiResponse(200, { item }, 'Audit item updated successfully'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audits/:id/discrepancies (Computed discrepancies)
// ─────────────────────────────────────────────────────────────────────────────
const getDiscrepancies = async (req, res, next) => {
  const cycle = await AuditCycle.findById(req.params.id)
    .populate('auditItems.asset', 'name assetTag status location')
    .populate('auditItems.auditor', 'name email');

  if (!cycle) return next(new ApiError(404, 'Audit cycle not found'));

  // Discrepancy means confirmation of 'Missing' or 'Damaged' items
  const discrepancies = cycle.auditItems.filter((item) =>
    ['Missing', 'Damaged'].includes(item.result)
  );

  res.status(200).json(new ApiResponse(200, { discrepancies }, 'Discrepancy report fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/audits/:id/close (Locks the cycle & marks missing assets as Lost)
// ─────────────────────────────────────────────────────────────────────────────
const closeAuditCycle = async (req, res, next) => {
  const cycle = await AuditCycle.findById(req.params.id);
  if (!cycle) return next(new ApiError(404, 'Audit cycle not found'));

  if (cycle.status !== 'Open') {
    return next(new ApiError(400, 'Audit cycle is already closed'));
  }

  // Close status
  cycle.status = 'Closed';
  await cycle.save();

  // Perform bulk actions for confirmed Missing items -> update asset.status to 'Lost'
  const missingItems = cycle.auditItems.filter((item) => item.result === 'Missing');

  const assetUpdates = missingItems.map(async (item) => {
    const asset = await Asset.findById(item.asset);
    if (asset) {
      // Validate transition: check if state machine allows moving to 'Lost'
      try {
        validateTransition(asset.status, 'Lost');
        asset.status = 'Lost';
        // Add note to asset history
        asset.allocationHistory.push({
          notes: `Asset marked Lost during Audit Cycle: ${cycle.title}. Notes: ${item.notes || 'None'}`,
          fromDate: new Date(),
        });
        await asset.save();
      } catch {
        // Fallback: If validator blocks transition (e.g. Disposed to Lost), skip to prevent crash
      }
    }
  });

  await Promise.all(assetUpdates);

  res.status(200).json(new ApiResponse(200, { cycle }, 'Audit cycle closed and missing items set to Lost'));
};

module.exports = {
  getAuditCycles,
  getAuditCycle,
  createAuditCycle,
  assignAuditors,
  updateAuditItem,
  getDiscrepancies,
  closeAuditCycle,
};
