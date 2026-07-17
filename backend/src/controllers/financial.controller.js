/**
 * ExpenseFlow - Financial Controller
 * HTTP request handlers for Financial Engine endpoints.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { financialEngine } = require('../services');

const getCircleFinancialSummary = catchAsync(async (req, res) => {
  const { circleId } = req.params;
  const result = await financialEngine.getCircleSummary(circleId, req.userId);
  ApiResponse.success('Circle financial summary retrieved', result).send(res);
});

const getDashboard = catchAsync(async (req, res) => {
  const result = await financialEngine.getDashboard(req.userId);
  ApiResponse.success('Dashboard data retrieved', result).send(res);
});

const getPeopleSummary = catchAsync(async (req, res) => {
  const result = await financialEngine.getPeopleSummary(req.userId);
  ApiResponse.success('People summary retrieved', result).send(res);
});

const getLedger = catchAsync(async (req, res) => {
  const result = await financialEngine.getLedger(req.userId, req.query);
  ApiResponse.success('Ledger retrieved', result).send(res);
});

const getAnalyticsSummary = catchAsync(async (req, res) => {
  const { period = 'all' } = req.query;
  const result = await financialEngine.getAnalytics(req.userId, period);
  ApiResponse.success('Analytics summary retrieved', result).send(res);
});

const getProfileStats = catchAsync(async (req, res) => {
  const result = await financialEngine.getProfileStats(req.userId);
  ApiResponse.success('Profile stats retrieved', result).send(res);
});

module.exports = {
  getCircleFinancialSummary,
  getDashboard,
  getPeopleSummary,
  getLedger,
  getAnalyticsSummary,
  getProfileStats,
};
