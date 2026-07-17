/**
 * ExpenseFlow - Search Routes
 * Global search routes.
 */
const { Router } = require('express');
const { searchController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { searchValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/', validate(searchValidator.searchSchema), searchController.globalSearch);

module.exports = router;