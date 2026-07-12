const User      = require('../models/User');
const ApiError  = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Roles that can be assigned via the Employee Directory
const PROMOTABLE_ROLES = ['AssetManager', 'DepartmentHead', 'Employee'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// Query: search, role, department, status, page, limit
// ─────────────────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  const { search, role, department, status, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (role)       filter.role       = role;
  if (department) filter.department = department;
  if (status)     filter.status     = status;
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate('department', 'name code')
    .select('-password')
    .sort({ name: 1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json(
    new ApiResponse(200, { users, total, page: Number(page), limit: Number(limit) }, 'Users fetched')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
const getUser = async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'name code status')
    .select('-password');

  if (!user) return next(new ApiError(404, 'User not found'));
  res.status(200).json(new ApiResponse(200, { user }, 'User fetched'));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/role  (Admin only — enforced at route AND controller)
// ─────────────────────────────────────────────────────────────────────────────
const updateUserRole = async (req, res, next) => {
  const { role } = req.body;
  const { id }   = req.params;

  if (!role) return next(new ApiError(400, 'Role is required'));

  // Only promotable roles allowed — Admin can NEVER be assigned via this endpoint
  if (!PROMOTABLE_ROLES.includes(role)) {
    return next(
      new ApiError(400, `Role must be one of: ${PROMOTABLE_ROLES.join(', ')}. Admin is assigned only via seeder.`)
    );
  }

  const target = await User.findById(id).select('-password');
  if (!target) return next(new ApiError(404, 'User not found'));

  // Cannot change another Admin's role via this endpoint
  if (target.role === 'Admin') {
    return next(new ApiError(403, 'Admin role cannot be modified via this endpoint'));
  }

  // Admin cannot demote/change their own role
  if (req.user._id.toString() === id) {
    return next(new ApiError(403, 'You cannot change your own role'));
  }

  target.role = role;
  await target.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, { user: target }, `User role updated to ${role}`));
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/status  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const updateUserStatus = async (req, res, next) => {
  const { id } = req.params;

  const target = await User.findById(id).select('-password');
  if (!target) return next(new ApiError(404, 'User not found'));

  // Admin cannot deactivate their own account
  if (req.user._id.toString() === id) {
    return next(new ApiError(403, 'You cannot deactivate your own account'));
  }

  target.status = target.status === 'Active' ? 'Inactive' : 'Active';
  await target.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, { user: target }, `User ${target.status === 'Active' ? 'activated' : 'deactivated'}`)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id  — general profile update (Admin or self)
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  const { name, department } = req.body;
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return next(new ApiError(404, 'User not found'));

  if (name)       user.name       = name.trim();
  if (department !== undefined) user.department = department || null;

  await user.save({ validateBeforeSave: false });
  res.status(200).json(new ApiResponse(200, { user }, 'User updated'));
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id  (Admin only — hard delete, use with caution)
// ─────────────────────────────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ApiError(404, 'User not found'));
  if (req.user._id.toString() === req.params.id) {
    return next(new ApiError(403, 'You cannot delete your own account'));
  }
  await user.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'User deleted'));
};

module.exports = { getUsers, getUser, updateUser, updateUserRole, updateUserStatus, deleteUser };
