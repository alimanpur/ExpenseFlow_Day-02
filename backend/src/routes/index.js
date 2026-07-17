/**
 * ExpenseFlow - Routes Index
 * Centralized route registration with API version prefix.
 */
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const circleRoutes = require('./circle.routes');
const expenseRoutes = require('./expense.routes');
const receiptRoutes = require('./receipt.routes');
const settlementRoutes = require('./settlement.routes');
const searchRoutes = require('./search.routes');
const notificationRoutes = require('./notification.routes');
const activityRoutes = require('./activity.routes');
const analyticsRoutes = require('./analytics.routes');
const reportsRoutes = require('./reports.routes');
const dashboardRoutes = require('./dashboard.routes');
const financialRoutes = require('./financial.routes');

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ExpenseFlow API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/circles', circleRoutes);
router.use('/expenses', expenseRoutes);
router.use('/expenses', receiptRoutes);
router.use('/settlements', settlementRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activities', activityRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/financial', financialRoutes);

module.exports = router;
