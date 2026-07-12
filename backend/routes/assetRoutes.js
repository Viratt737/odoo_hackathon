const express  = require('express');
const router   = express.Router();
const path     = require('path');

const {
  getAssets, getAsset, createAsset, updateAsset, updateAssetStatus, deleteAsset,
} = require('../controllers/assetController');

const { protect, requireRole } = require('../middleware/auth');
const { uploadAssetFiles }     = require('../middleware/upload');

// ── View routes — all authenticated users ──────────────────────────────────
router.get('/',    protect, getAssets);
router.get('/:id', protect, getAsset);

// ── Write routes — Admin + AssetManager only ───────────────────────────────
router.post(
  '/',
  protect,
  requireRole('Admin', 'AssetManager'),
  uploadAssetFiles,
  createAsset
);

router.put(
  '/:id',
  protect,
  requireRole('Admin', 'AssetManager'),
  uploadAssetFiles,
  updateAsset
);

router.patch(
  '/:id/status',
  protect,
  requireRole('Admin', 'AssetManager'),
  updateAssetStatus
);

router.delete(
  '/:id',
  protect,
  requireRole('Admin'),
  deleteAsset
);

module.exports = router;
