const AssetCategory = require('../models/AssetCategory');
const ApiError      = require('../utils/ApiError');
const ApiResponse   = require('../utils/ApiResponse');

const generateCode = (name) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w) => w.slice(0, 4))
    .join('')
    .slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const categories = await AssetCategory.find(filter)
    .populate('parentCategory', 'name code')
    .sort({ name: 1 });

  res.status(200).json(new ApiResponse(200, { categories }, 'Categories fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id
// ─────────────────────────────────────────────────────────────────────────────
const getCategory = async (req, res, next) => {
  const category = await AssetCategory.findById(req.params.id)
    .populate('parentCategory', 'name code');

  if (!category) return next(new ApiError(404, 'Asset category not found'));
  res.status(200).json(new ApiResponse(200, { category }, 'Category fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// ─────────────────────────────────────────────────────────────────────────────
const createCategory = async (req, res, next) => {
  const {
    name, code, description, parentCategory,
    depreciationRate, usefulLifeYears, maintenanceIntervalDays,
    customFields,
  } = req.body;

  if (!name) return next(new ApiError(400, 'Category name is required'));

  // Validate customFields array if provided
  if (customFields && !Array.isArray(customFields)) {
    return next(new ApiError(400, 'customFields must be an array'));
  }

  const finalCode = code?.trim().toUpperCase() || generateCode(name);

  const category = await AssetCategory.create({
    name:                    name.trim(),
    code:                    finalCode,
    description:             description?.trim() || '',
    parentCategory:          parentCategory || null,
    depreciationRate:        depreciationRate ?? 0,
    usefulLifeYears:         usefulLifeYears ?? null,
    maintenanceIntervalDays: maintenanceIntervalDays ?? null,
    customFields:            customFields || [],
    status:                  'Active',
  });

  res.status(201).json(new ApiResponse(201, { category }, 'Category created'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/categories/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateCategory = async (req, res, next) => {
  const category = await AssetCategory.findById(req.params.id);
  if (!category) return next(new ApiError(404, 'Asset category not found'));

  const allowed = [
    'name', 'code', 'description', 'parentCategory',
    'depreciationRate', 'usefulLifeYears', 'maintenanceIntervalDays', 'customFields',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      category[field] = field === 'code'
        ? req.body[field].trim().toUpperCase()
        : req.body[field];
    }
  });

  await category.save();
  res.status(200).json(new ApiResponse(200, { category }, 'Category updated'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/categories/:id/status
// ─────────────────────────────────────────────────────────────────────────────
const toggleCategoryStatus = async (req, res, next) => {
  const category = await AssetCategory.findById(req.params.id);
  if (!category) return next(new ApiError(404, 'Asset category not found'));

  category.status = category.status === 'Active' ? 'Inactive' : 'Active';
  await category.save();

  res.status(200).json(
    new ApiResponse(200, { category }, `Category ${category.status === 'Active' ? 'activated' : 'deactivated'}`)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteCategory = async (req, res, next) => {
  const category = await AssetCategory.findById(req.params.id);
  if (!category) return next(new ApiError(404, 'Asset category not found'));

  await category.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Category permanently deleted'));
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
};
