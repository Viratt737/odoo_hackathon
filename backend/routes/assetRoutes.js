const express = require('express');
const router = express.Router();
const { getAssets, getAsset, createAsset, updateAsset, deleteAsset } = require('../controllers/assetController');

router.get('/', getAssets);
router.post('/', createAsset);
router.get('/:id', getAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
