/**
 * ExpenseFlow - Expense Controller
 * HTTP request handlers for expense management.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { expenseService } = require('../services');

const createExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.createExpense(req.userId, req.body);
  ApiResponse.created('Expense created', expense).send(res);
});

const getExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.getExpense(req.params.expenseId, req.userId);
  ApiResponse.success('Expense retrieved', expense).send(res);
});

const getCircleExpenses = catchAsync(async (req, res) => {
  const result = await expenseService.getCircleExpenses(req.params.circleId, req.userId, req.query);
  ApiResponse.success('Expenses retrieved', result.expenses, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const updateExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.expenseId, req.userId, req.body);
  ApiResponse.success('Expense updated', expense).send(res);
});

const deleteExpense = catchAsync(async (req, res) => {
  await expenseService.deleteExpense(req.params.expenseId, req.userId);
  ApiResponse.success('Expense deleted').send(res);
});

const getUserExpenses = catchAsync(async (req, res) => {
  const result = await expenseService.getUserExpenses(req.userId, req.query);
  ApiResponse.success('Expenses retrieved', result.expenses, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const restoreExpense = catchAsync(async (req, res) => {
  await expenseService.restoreExpense(req.params.expenseId, req.userId);
  ApiResponse.success('Expense restored').send(res);
});

const getAllExpenses = catchAsync(async (req, res) => {
  const result = await expenseService.getAllExpenses(req.userId, req.query);
  ApiResponse.success('Expenses retrieved', result.expenses, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const getExpenseStatistics = catchAsync(async (req, res) => {
  const stats = await expenseService.getExpenseStatistics(req.userId);
  ApiResponse.success('Statistics retrieved', stats).send(res);
});

const searchExpenses = catchAsync(async (req, res) => {
  const result = await expenseService.searchExpenses(req.userId, req.query);
  ApiResponse.success('Search results', result.expenses, {
    total: result.total,
  }).send(res);
});

const getExpenseTimeline = catchAsync(async (req, res) => {
  const timeline = await expenseService.getExpenseTimeline(req.params.expenseId, req.userId);
  ApiResponse.success('Timeline retrieved', timeline).send(res);
});

const bulkDeleteExpenses = catchAsync(async (req, res) => {
  const { expenseIds } = req.body;
  const result = await expenseService.bulkDeleteExpenses(expenseIds, req.userId);
  ApiResponse.success('Bulk delete completed', result).send(res);
});

const bulkArchiveExpenses = catchAsync(async (req, res) => {
  const { expenseIds } = req.body;
  const result = await expenseService.bulkArchiveExpenses(expenseIds, req.userId);
  ApiResponse.success('Bulk archive completed', result).send(res);
});

const bulkRestoreExpenses = catchAsync(async (req, res) => {
  const { expenseIds } = req.body;
  const result = await expenseService.bulkRestoreExpenses(expenseIds, req.userId);
  ApiResponse.success('Bulk restore completed', result).send(res);
});

const bulkUpdateCategory = catchAsync(async (req, res) => {
  const { expenseIds, category } = req.body;
  const result = await expenseService.bulkUpdateCategory(expenseIds, category, req.userId);
  ApiResponse.success('Bulk category update completed', result).send(res);
});

const bulkMoveToCircle = catchAsync(async (req, res) => {
  const { expenseIds, targetCircleId } = req.body;
  const result = await expenseService.bulkMoveToCircle(expenseIds, targetCircleId, req.userId);
  ApiResponse.success('Bulk move completed', result).send(res);
});

const exportExpenses = catchAsync(async (req, res) => {
  const { format = 'csv' } = req.params;
  const filters = req.query;
  const data = await expenseService.exportExpenses(req.userId, format, filters);
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.json');
    return res.send(data);
  }
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    return res.send(data);
  }
  
  if (format === 'excel') {
    return ApiResponse.success('Export data', data).send(res);
  }
  
  ApiResponse.success('Export completed', data).send(res);
});

module.exports = {
  createExpense,
  getExpense,
  getCircleExpenses,
  updateExpense,
  deleteExpense,
  getUserExpenses,
  restoreExpense,
  getAllExpenses,
  getExpenseStatistics,
  searchExpenses,
  getExpenseTimeline,
  bulkDeleteExpenses,
  bulkArchiveExpenses,
  bulkRestoreExpenses,
  bulkUpdateCategory,
  bulkMoveToCircle,
  exportExpenses,
};
