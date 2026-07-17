/**
 * ExpenseFlow - Controllers Index
 * Centralized controller exports.
 */
const authController = require('./auth.controller');
const circleController = require('./circle.controller');
const expenseController = require('./expense.controller');
const settlementController = require('./settlement.controller');
const searchController = require('./search.controller');
const notificationController = require('./notification.controller');
const activityController = require('./activity.controller');
const analyticsController = require('./analytics.controller');
const reportsController = require('./reports.controller');
const dashboardController = require('./dashboard.controller');
const receiptController = require('./receipt.controller');
const financialController = require('./financial.controller');

module.exports = {
  authController,
  circleController,
  expenseController,
  settlementController,
  searchController,
  notificationController,
  activityController,
  analyticsController,
  reportsController,
  dashboardController,
  receiptController,
  financialController,
};
