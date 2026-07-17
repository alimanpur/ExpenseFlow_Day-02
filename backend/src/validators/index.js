/**
 * ExpenseFlow - Validators Index
 * Centralized validator exports.
 */
const authValidator = require('./auth.validator');
const circleValidator = require('./circle.validator');
const expenseValidator = require('./expense.validator');
const settlementValidator = require('./settlement.validator');
const searchValidator = require('./search.validator');
const notificationValidator = require('./notification.validator');
const activityValidator = require('./activity.validator');
const analyticsValidator = require('./analytics.validator');
const reportsValidator = require('./reports.validator');
const dashboardValidator = require('./dashboard.validator');
const receiptValidator = require('./receipt.validator');

module.exports = {
  authValidator,
  circleValidator,
  expenseValidator,
  settlementValidator,
  searchValidator,
  notificationValidator,
  activityValidator,
  analyticsValidator,
  reportsValidator,
  dashboardValidator,
  receiptValidator,
};