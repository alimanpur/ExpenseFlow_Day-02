/**
 * ExpenseFlow - Analytics Routes
 * Analytics endpoints.
 */
const { Router } = require('express');
const { analyticsController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { analyticsValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/spending/monthly', validate(analyticsValidator.monthlySpendingSchema), analyticsController.getMonthlySpending);
router.get('/spending/weekly', validate(analyticsValidator.weeklySpendingSchema), analyticsController.getWeeklySpending);
router.get('/spending/daily', validate(analyticsValidator.dailySpendingSchema), analyticsController.getDailySpending);
router.get('/categories/distribution', validate(analyticsValidator.categoryDistributionSchema), analyticsController.getCategoryDistribution);
router.get('/members/balances/:circleId', validate(analyticsValidator.memberBalancesSchema), analyticsController.getMemberBalances);
router.get('/circles/comparison', validate(analyticsValidator.circleComparisonSchema), analyticsController.getCircleComparison);
router.get('/top/expenses', validate(analyticsValidator.topExpensesSchema), analyticsController.getTopExpenses);
router.get('/top/payers', validate(analyticsValidator.topPayersSchema), analyticsController.getTopPayers);
router.get('/top/receivers', validate(analyticsValidator.topReceiversSchema), analyticsController.getTopReceivers);
router.get('/settlements/statistics/:circleId', validate(analyticsValidator.settlementStatisticsSchema), analyticsController.getSettlementStatistics);
router.get('/cash-flow', validate(analyticsValidator.cashFlowSchema), analyticsController.getCashFlow);
router.get('/dashboard', validate(analyticsValidator.dashboardSummarySchema), analyticsController.getDashboardSummary);

module.exports = router;
