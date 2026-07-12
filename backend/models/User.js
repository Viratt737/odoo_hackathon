const mongoose = require('mongoose');
const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');

const ROLES = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be one of: Admin, AssetManager, DepartmentHead, Employee',
      },
      default: 'Employee',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // Password reset
    passwordChangedAt:     { type: Date, select: false },
    passwordResetToken:    { type: String, select: false },
    passwordResetExpires:  { type: Date, select: false },
  },
  { timestamps: true }
);

// ─── Pre-save hook: hash password when it is new or modified ─────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  // Remove reset fields after password change (if it was a reset flow)
  if (!this.isNew) {
    this.passwordChangedAt    = new Date(Date.now() - 1000); // 1s in the past
    this.passwordResetToken   = undefined;
    this.passwordResetExpires = undefined;
  }
  next();
});

// ─── Instance method: compare a plain password against the stored hash ────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance method: generate + store a password-reset token ─────────────────
userSchema.methods.createPasswordResetToken = function () {
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const hashedTok = crypto.createHash('sha256').update(rawToken).digest('hex');

  this.passwordResetToken   = hashedTok;
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return rawToken; // send this to the user (not the hash)
};

// ─── Instance method: check if password was changed after JWT was issued ──────
userSchema.methods.changedPasswordAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedAt = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtIssuedAt < changedAt;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
