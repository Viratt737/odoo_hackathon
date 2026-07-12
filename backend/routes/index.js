const express = require('express');
const router = express.Router();

const { healthCheck } = require('../controllers/healthController');

const authRoutes         = require('./authRoutes');
const userRoutes         = require('./userRoutes');
const departmentRoutes   = require('./departmentRoutes');
const categoryRoutes     = require('./assetCategoryRoutes');
const assetRoutes        = require('./assetRoutes');
const allocationRoutes   = require('./allocationRoutes');
const bookingRoutes      = require('./bookingRoutes');
const maintenanceRoutes  = require('./maintenanceRoutes');
const auditRoutes        = require('./auditRoutes');
const notificationRoutes = require('./notificationRoutes');

// Health check (public)
router.get('/health', healthCheck);

// Resource routes
router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/departments',   departmentRoutes);
router.use('/categories',    categoryRoutes);
router.use('/assets',        assetRoutes);
router.use('/allocations',   allocationRoutes);
router.use('/bookings',      bookingRoutes);
router.use('/maintenance',   maintenanceRoutes);
router.use('/audits',        auditRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
