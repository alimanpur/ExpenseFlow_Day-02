/**
 * ExpenseFlow - Reports Routes
 * Report generation and export routes.
 */
const { Router } = require('express');
const { reportsController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { reportsValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/monthly', validate(reportsValidator.monthlyReportSchema), reportsController.getMonthlyReport);
router.get('/circles/:circleId', validate(reportsValidator.circleReportSchema), reportsController.getCircleReport);
router.get('/members', validate(reportsValidator.memberReportSchema), reportsController.getMemberReport);
router.get('/settlements', validate(reportsValidator.settlementReportSchema), reportsController.getSettlementReport);
router.get('/expenses', validate(reportsValidator.expenseReportSchema), reportsController.getExpenseReport);
router.post('/export', validate(reportsValidator.exportReportSchema), reportsController.exportReport);

module.exports = router;
