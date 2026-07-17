/**
 * ExpenseFlow - Expense Routes
 * Expense management routes.
 *
 * ROUTE ORDERING: Literal/static routes MUST be declared BEFORE
 * parameterized routes (i.e. /:expenseId) to prevent Express from
 * matching "statistics", "search", "export", etc. as expenseId values.
 */
const { Router } = require('express');
const { expenseController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { expenseValidator } = require('../validators');

const router = Router();

// All expense routes require authentication
router.use(authenticate);

// ──────────────────────────────────────────────────────
// STATIC/LITERAL ROUTES — must come BEFORE /:expenseId
// ──────────────────────────────────────────────────────

// User expenses
router.get('/me', validate(expenseValidator.paginationQuerySchema), expenseController.getUserExpenses);

// Circle expenses
router.get('/circle/:circleId', validate(expenseValidator.circleExpenseQuerySchema), expenseController.getCircleExpenses);

// Entries Management Center - Master endpoints (static routes)
router.get('/', validate(expenseValidator.entriesQuerySchema), expenseController.getAllExpenses);
router.get('/statistics', expenseController.getExpenseStatistics);
router.get('/search', validate(expenseValidator.searchQuerySchema), expenseController.searchExpenses);
router.get('/export/:format', validate(expenseValidator.exportSchema), expenseController.exportExpenses);

// Timeline (static prefix before /:expenseId)
router.get('/timeline/:expenseId', validate(expenseValidator.expenseIdParamSchema), expenseController.getExpenseTimeline);

// Bulk operations (POST, no conflict with GET /:expenseId)
router.post('/bulk/delete', validate(expenseValidator.bulkOperationSchema), expenseController.bulkDeleteExpenses);
router.post('/bulk/archive', validate(expenseValidator.bulkOperationSchema), expenseController.bulkArchiveExpenses);
router.post('/bulk/restore', validate(expenseValidator.bulkOperationSchema), expenseController.bulkRestoreExpenses);
router.post('/bulk/category', validate(expenseValidator.bulkCategorySchema), expenseController.bulkUpdateCategory);
router.post('/bulk/move', validate(expenseValidator.bulkMoveSchema), expenseController.bulkMoveToCircle);

// ──────────────────────────────────────────────────────
// PARAMETERIZED ROUTES — must come AFTER all static routes
// ──────────────────────────────────────────────────────

// Create expense
router.post('/', validate(expenseValidator.createExpenseSchema), expenseController.createExpense);

// Single expense CRUD (/:expenseId would also match "statistics", "search", etc.
// if placed before the static routes above)
router.get('/:expenseId', validate(expenseValidator.expenseIdParamSchema), expenseController.getExpense);
router.patch('/:expenseId', validate(expenseValidator.expenseIdParamSchema), validate(expenseValidator.updateExpenseSchema), expenseController.updateExpense);
router.delete('/:expenseId', validate(expenseValidator.expenseIdParamSchema), expenseController.deleteExpense);
router.patch('/:expenseId/restore', validate(expenseValidator.expenseIdParamSchema), expenseController.restoreExpense);

module.exports = router;