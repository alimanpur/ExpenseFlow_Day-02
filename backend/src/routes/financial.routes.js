/**
 * ExpenseFlow - Financial Routes
 * Financial Engine endpoints.
 */
const { Router } = require('express');
const { financialController } = require('../controllers');
const { authenticate } = require('../middleware');

const router = Router();

router.use(authenticate);

router.get('/circles/:circleId/financial-summary', financialController.getCircleFinancialSummary);
router.get('/users/me/dashboard', financialController.getDashboard);
router.get('/users/me/people-summary', financialController.getPeopleSummary);
router.get('/users/me/ledger', financialController.getLedger);
router.get('/analytics/summary', financialController.getAnalyticsSummary);
router.get('/users/me/profile-stats', financialController.getProfileStats);

module.exports = router;
