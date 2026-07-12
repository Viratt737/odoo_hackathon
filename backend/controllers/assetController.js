const path      = require('path');
const Asset     = require('../models/Asset');
const ApiError  = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { nextTag } = require('../utils/assetTagCounter');
const { validateTransition } = require('../utils/assetStateMachine');

// Helper: build file URL from multer file object
const fileUrl = (file) => `/uploads/${file.fieldname}s/${file.filename}`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assets
// Query: search, status, category, department, location, page, limit
// ─────────────────────────────────────────────────────────────────────────────
const getAssets = async (req, res) => {
  const {
    search, status, category, department, location,
    page = 1, limit = 20,
  } = req.query;

  const filter = {};
  if (status)     filter.status     = status;
  if (category)   filter.category   = category;
  if (department) filter.department = department;
  if (location)   filter.location   = { $regex: location, $options: 'i' };

  if (search) {
    filter.$or = [
      { name:         { $regex: search, $options: 'i' } },
      { assetTag:     { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
      { location:     { $regex: search, $options: 'i' } },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Asset.countDocuments(filter);

  const assets = await Asset.find(filter)
    .populate('category',   'name code customFields')
    .populate('department', 'name code')
    .populate('registeredBy', 'name')
    .select('-allocationHistory -maintenanceHistory') // exclude large arrays from list
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json(
    new ApiResponse(200, { assets, total, page: Number(page), limit: Number(limit) }, 'Assets fetched')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assets/:id
// ─────────────────────────────────────────────────────────────────────────────
const getAsset = async (req, res, next) => {
  const asset = await Asset.findById(req.params.id)
    .populate('category',   'name code customFields depreciationRate usefulLifeYears maintenanceIntervalDays')
    .populate('department', 'name code')
    .populate('registeredBy',  'name email')
    .populate('lastUpdatedBy', 'name email')
    .populate('allocationHistory.allocatedTo', 'name email')
    .populate('allocationHistory.allocatedBy', 'name email')
    .populate('maintenanceHistory.request');

  if (!asset) return next(new ApiError(404, 'Asset not found'));
  res.status(200).json(new ApiResponse(200, { asset }, 'Asset fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assets
// ─────────────────────────────────────────────────────────────────────────────
const createAsset = async (req, res, next) => {
  const {
    name, serialNumber, category, department,
    acquisitionDate, acquisitionCost, vendor, warrantyExpiryDate,
    location, description, condition, isBookable,
    customFieldValues,
  } = req.body;

  if (!name)     return next(new ApiError(400, 'Asset name is required'));
  if (!category) return next(new ApiError(400, 'Asset category is required'));

  // Auto-generate asset tag
  const assetTag = await nextTag();

  // Handle uploaded files
  const photos    = (req.files?.photos    || []).map(fileUrl);
  const documents = (req.files?.documents || []).map(fileUrl);

  // Parse customFieldValues if sent as JSON string (multipart)
  let parsedCustomFields = {};
  if (customFieldValues) {
    try {
      parsedCustomFields = typeof customFieldValues === 'string'
        ? JSON.parse(customFieldValues)
        : customFieldValues;
    } catch {
      return next(new ApiError(400, 'customFieldValues must be valid JSON'));
    }
  }

  const asset = await Asset.create({
    name:              name.trim(),
    assetTag,
    serialNumber:      serialNumber?.trim() || null,
    category,
    department:        department || null,
    acquisitionDate:   acquisitionDate || null,
    acquisitionCost:   acquisitionCost ? Number(acquisitionCost) : 0,
    vendor:            vendor?.trim() || '',
    warrantyExpiryDate: warrantyExpiryDate || null,
    location:          location?.trim() || '',
    description:       description?.trim() || '',
    condition:         condition || 'Good',
    isBookable:        isBookable === 'true' || isBookable === true || false,
    customFieldValues: parsedCustomFields,
    photos,
    documents,
    status:        'Available',
    registeredBy:  req.user._id,
    lastUpdatedBy: req.user._id,
  });

  await asset.populate('category department');

  res.status(201).json(new ApiResponse(201, { asset }, `Asset registered with tag ${assetTag}`));
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/assets/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateAsset = async (req, res, next) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  const updatable = [
    'name', 'serialNumber', 'category', 'department',
    'acquisitionDate', 'acquisitionCost', 'vendor', 'warrantyExpiryDate',
    'location', 'description', 'condition', 'isBookable',
  ];

  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      asset[field] = req.body[field];
    }
  });

  // Custom field values
  if (req.body.customFieldValues) {
    try {
      const vals = typeof req.body.customFieldValues === 'string'
        ? JSON.parse(req.body.customFieldValues)
        : req.body.customFieldValues;
      asset.customFieldValues = new Map(Object.entries(vals));
    } catch {
      return next(new ApiError(400, 'customFieldValues must be valid JSON'));
    }
  }

  // Append new uploaded files
  if (req.files?.photos)    asset.photos    = [...asset.photos,    ...(req.files.photos    || []).map(fileUrl)];
  if (req.files?.documents) asset.documents = [...asset.documents, ...(req.files.documents || []).map(fileUrl)];

  asset.lastUpdatedBy = req.user._id;
  await asset.save();
  await asset.populate('category department');

  res.status(200).json(new ApiResponse(200, { asset }, 'Asset updated'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assets/:id/status
// Body: { status: 'Available' | ... }
// ─────────────────────────────────────────────────────────────────────────────
const updateAssetStatus = async (req, res, next) => {
  const { status: newStatus } = req.body;
  if (!newStatus) return next(new ApiError(400, 'New status is required'));

  const asset = await Asset.findById(req.params.id);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  // Throws ApiError if transition is invalid
  validateTransition(asset.status, newStatus);

  asset.status = newStatus;
  asset.lastUpdatedBy = req.user._id;
  await asset.save();

  res.status(200).json(
    new ApiResponse(200, { asset }, `Asset status changed to '${newStatus}'`)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/assets/:id  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteAsset = async (req, res, next) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return next(new ApiError(404, 'Asset not found'));

  if (asset.status === 'Allocated') {
    return next(new ApiError(400, 'Cannot delete an allocated asset — return it first'));
  }

  await asset.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Asset permanently deleted'));
};

module.exports = { getAssets, getAsset, createAsset, updateAsset, updateAssetStatus, deleteAsset };
