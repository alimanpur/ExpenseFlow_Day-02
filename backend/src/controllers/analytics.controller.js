/**
 * ExpenseFlow - Analytics Controller
 * HTTP request handlers for analytics endpoints.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { analyticsService } = require('../services');

const getMonthlySpending = catchAsync(async (req, res) => {
  const { circleId, year, month } = req.query;
  const result = await analyticsService.getMonthlySpending(req.userId, circleId, year, month);
  ApiResponse.success('Monthly spending retrieved', result).send(res);
});

const getWeeklySpending = catchAsync(async (req, res) => {
  const { circleId, year, month } = req.query;
  const result = await analyticsService.getWeeklySpending(req.userId, circleId, year, month);
  ApiResponse.success('Weekly spending retrieved', result).send(res);
});

const getDailySpending = catchAsync(async (req, res) => {
  const { startDate, endDate, circleId } = req.query;
  const result = await analyticsService.getDailySpending(req.userId, startDate, endDate, circleId);
  ApiResponse.success('Daily spending retrieved', result).send(res);
});

const getCategoryDistribution = catchAsync(async (req, res) => {
  const { circleId, startDate, endDate } = req.query;
  const result = await analyticsService.getCategoryDistribution(req.userId, circleId, startDate, endDate);
  ApiResponse.success('Category distribution retrieved', result).send(res);
});

const getMemberBalances = catchAsync(async (req, res) => {
  const { circleId } = req.params;
  const result = await analyticsService.getMemberBalances(circleId);
  ApiResponse.success('Member balances retrieved', result).send(res);
});

const getCircleComparison = catchAsync(async (req, res) => {
  const { circleIds } = req.query;
  const ids = circleIds ? circleIds.split(',') : null;
  const result = await analyticsService.getCircleComparison(req.userId, ids);
  ApiResponse.success('Circle comparison retrieved', result).send(res);
});

const getTopExpenses = catchAsync(async (req, res) => {
  const { circleId, limit } = req.query;
  const result = await analyticsService.getTopExpenses(req.userId, circleId, limit);
  ApiResponse.success('Top expenses retrieved', result).send(res);
});

const getTopPayers = catchAsync(async (req, res) => {
  const { circleId, limit } = req.query;
  const result = await analyticsService.getTopPayers(req.userId, circleId, limit);
  ApiResponse.success('Top payers retrieved', result).send(res);
});

const getTopReceivers = catchAsync(async (req, res) => {
  const { circleId, limit } = req.query;
  const result = await analyticsService.getTopReceivers(req.userId, circleId, limit);
  ApiResponse.success('Top receivers retrieved', result).send(res);
});

const getSettlementStatistics = catchAsync(async (req, res) => {
  const { circleId } = req.params;
  const result = await analyticsService.getSettlementStatistics(circleId);
  ApiResponse.success('Settlement statistics retrieved', result).send(res);
});

const getCashFlow = catchAsync(async (req, res) => {
  const { startDate, endDate, circleId } = req.query;
  const result = await analyticsService.getCashFlow(req.userId, startDate, endDate, circleId);
  ApiResponse.success('Cash flow retrieved', result).send(res);
});

const getDashboardSummary = catchAsync(async (req, res) => {
  const result = await analyticsService.getDashboardSummary(req.userId);
  ApiResponse.success('Dashboard summary retrieved', result).send(res);
});

module.exports = {
  getMonthlySpending,
  getWeeklySpending,
  getDailySpending,
  getCategoryDistribution,
  getMemberBalances,
  getCircleComparison,
  getTopExpenses,
  getTopPayers,
  getTopReceivers,
  getSettlementStatistics,
  getCashFlow,
  getDashboardSummary,
};
