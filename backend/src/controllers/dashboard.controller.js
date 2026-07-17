/**
 * ExpenseFlow - Dashboard Controller
 * HTTP request handlers for dashboard summary.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { dashboardService } = require('../services');

const getDashboard = catchAsync(async (req, res) => {
  const result = await dashboardService.getDashboard(req.userId);
  ApiResponse.success('Dashboard data retrieved', result).send(res);
});

module.exports = {
  getDashboard,
};
