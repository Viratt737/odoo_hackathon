const mongoose = require('mongoose');
const Department  = require('../models/Department');
const ApiError    = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ─── Helper: auto-generate a code from the department name ───────────────────
const generateCode = (name) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w) => w.slice(0, 3))
    .join('')
    .slice(0, 10);

// ─── Helper: check for circular parent reference ──────────────────────────────
const hasCircularRef = async (deptId, parentId) => {
  if (!parentId) return false;
  if (deptId.toString() === parentId.toString()) return true;

  let current = await Department.findById(parentId).select('parentDepartment');
  while (current && current.parentDepartment) {
    if (current.parentDepartment.toString() === deptId.toString()) return true;
    current = await Department.findById(current.parentDepartment).select('parentDepartment');
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/departments
// ─────────────────────────────────────────────────────────────────────────────
const getDepartments = async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const departments = await Department.find(filter)
    .populate('head', 'name email role')
    .populate('parentDepartment', 'name code')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { departments }, 'Departments fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/departments/:id
// ─────────────────────────────────────────────────────────────────────────────
const getDepartment = async (req, res, next) => {
  const dept = await Department.findById(req.params.id)
    .populate('head', 'name email role avatar')
    .populate('parentDepartment', 'name code status');

  if (!dept) return next(new ApiError(404, 'Department not found'));
  res.status(200).json(new ApiResponse(200, { department: dept }, 'Department fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/departments
// ─────────────────────────────────────────────────────────────────────────────
const createDepartment = async (req, res, next) => {
  const { name, code, description, head, parentDepartment, location, budget } = req.body;

  if (!name) return next(new ApiError(400, 'Department name is required'));

  const finalCode = code?.trim().toUpperCase() || generateCode(name);

  // Validate no circular parent ref (new dept has no id yet, so we just need
  // to ensure it doesn't accidentally point to itself — not possible on create)
  const dept = await Department.create({
    name:             name.trim(),
    code:             finalCode,
    description:      description?.trim() || '',
    head:             head || null,
    parentDepartment: parentDepartment || null,
    location:         location?.trim() || '',
    budget:           budget || 0,
    status:           'Active',
  });

  await dept.populate('head', 'name email');
  await dept.populate('parentDepartment', 'name code');

  res.status(201).json(new ApiResponse(201, { department: dept }, 'Department created'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/departments/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateDepartment = async (req, res, next) => {
  const { id } = req.params;
  const { name, code, description, head, parentDepartment, location, budget } = req.body;

  const dept = await Department.findById(id);
  if (!dept) return next(new ApiError(404, 'Department not found'));

  // Guard against circular parent reference
  if (parentDepartment) {
    const isCircular = await hasCircularRef(
      new mongoose.Types.ObjectId(id),
      new mongoose.Types.ObjectId(parentDepartment)
    );
    if (isCircular) {
      return next(new ApiError(400, 'Circular parent department reference detected'));
    }
  }

  if (name)             dept.name             = name.trim();
  if (code)             dept.code             = code.trim().toUpperCase();
  if (description !== undefined) dept.description = description.trim();
  if (head !== undefined)        dept.head        = head || null;
  if (parentDepartment !== undefined) dept.parentDepartment = parentDepartment || null;
  if (location !== undefined)    dept.location    = location.trim();
  if (budget !== undefined)      dept.budget      = budget;

  await dept.save();
  await dept.populate('head', 'name email');
  await dept.populate('parentDepartment', 'name code');

  res.status(200).json(new ApiResponse(200, { department: dept }, 'Department updated'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/departments/:id/status
// ─────────────────────────────────────────────────────────────────────────────
const toggleDepartmentStatus = async (req, res, next) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return next(new ApiError(404, 'Department not found'));

  dept.status = dept.status === 'Active' ? 'Inactive' : 'Active';
  await dept.save();

  res.status(200).json(
    new ApiResponse(200, { department: dept }, `Department ${dept.status === 'Active' ? 'activated' : 'deactivated'}`)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/departments/:id  (hard delete — admin only, last resort)
// ─────────────────────────────────────────────────────────────────────────────
const deleteDepartment = async (req, res, next) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return next(new ApiError(404, 'Department not found'));

  await dept.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Department permanently deleted'));
};

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
};
