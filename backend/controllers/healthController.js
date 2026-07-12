const ApiResponse = require('../utils/ApiResponse');

// @desc    Health check
// @route   GET /api/health
// @access  Public
const healthCheck = (req, res) => {
  res.status(200).json(new ApiResponse(200, { status: 'ok', timestamp: new Date().toISOString() }, 'AssetFlow API is running'));
};

module.exports = { healthCheck };
