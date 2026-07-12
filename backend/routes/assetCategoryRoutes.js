const express = require('express');
const router  = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} = require('../controllers/assetCategoryController');

const { protect, requireRole } = require('../middleware/auth');

// All category routes require Admin
router.use(protect, requireRole('Admin'));

router.get('/',    getCategories);
router.post('/',   createCategory);
router.get('/:id', getCategory);
router.put('/:id', updateCategory);
router.patch('/:id/status', toggleCategoryStatus);
router.delete('/:id', deleteCategory);

module.exports = router;
