/**
 * ExpenseFlow - Dashboard Routes
 * Dashboard summary routes.
 */
const { Router } = require('express');
const { dashboardController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { dashboardValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/summary', validate(dashboardValidator.getDashboardSchema), dashboardController.getDashboard);

module.exports = router;
