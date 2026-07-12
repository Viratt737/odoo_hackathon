const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String,
      required: true,
      trim: true,
    },
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean'],
      default: 'text',
    },
  },
  { _id: false } // embedded — no separate _id per field
);

const assetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Category code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetCategory',
      default: null,
    },
    depreciationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    usefulLifeYears: {
      type: Number,
      default: null,
      min: 0,
    },
    maintenanceIntervalDays: {
      type: Number,
      default: null,
      min: 0,
    },
    // Category-specific flexible custom fields
    customFields: {
      type: [customFieldSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssetCategory', assetCategorySchema);
