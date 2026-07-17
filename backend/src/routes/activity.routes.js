/**
 * ExpenseFlow - Activity Timeline Routes
 * Activity timeline routes.
 */
const { Router } = require('express');
const { activityController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { activityValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/circles/:circleId/activities', validate(activityValidator.circleIdParamSchema), validate(activityValidator.paginationSchema), activityController.getCircleActivities);
router.get('/me/activities', validate(activityValidator.paginationSchema), activityController.getUserActivities);

module.exports = router;
