/**
 * ExpenseFlow - Reports Controller
 * HTTP request handlers for report generation and export.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { reportsService } = require('../services');

const getMonthlyReport = catchAsync(async (req, res) => {
  const { year, month, circleId } = req.query;
  const result = await reportsService.getMonthlyReport(req.userId, year, month, circleId);
  ApiResponse.success('Monthly report generated', result).send(res);
});

const getCircleReport = catchAsync(async (req, res) => {
  const { circleId } = req.params;
  const result = await reportsService.getCircleReport(req.userId, circleId);
  ApiResponse.success('Circle report generated', result).send(res);
});

const getMemberReport = catchAsync(async (req, res) => {
  const { memberId, circleId, startDate, endDate } = req.query;
  if (!memberId || !startDate || !endDate) {
    throw ApiError.badRequest('memberId, startDate, and endDate are required');
  }
  const result = await reportsService.getMemberReport(req.userId, memberId, circleId, startDate, endDate);
  ApiResponse.success('Member report generated', result).send(res);
});

const getSettlementReport = catchAsync(async (req, res) => {
  const { circleId, startDate, endDate } = req.query;
  const result = await reportsService.getSettlementReport(req.userId, circleId, startDate, endDate);
  ApiResponse.success('Settlement report generated', result).send(res);
});

const getExpenseReport = catchAsync(async (req, res) => {
  const { circleId, startDate, endDate } = req.query;
  const result = await reportsService.getExpenseReport(req.userId, circleId, startDate, endDate);
  ApiResponse.success('Expense report generated', result).send(res);
});

const exportReport = catchAsync(async (req, res) => {
  const { format, report } = req.body;
  if (!report || !format) {
    throw ApiError.badRequest('report data and format are required');
  }

  if (!['csv', 'json', 'pdf'].includes(format)) {
    throw ApiError.badRequest('Unsupported format. Use csv, json, or pdf');
  }

  const exported = reportsService.exportReport(report, format);
  ApiResponse.success('Report exported', exported).send(res);
});

module.exports = {
  getMonthlyReport,
  getCircleReport,
  getMemberReport,
  getSettlementReport,
  getExpenseReport,
  exportReport,
};
