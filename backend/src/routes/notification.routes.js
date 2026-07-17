/**
 * ExpenseFlow - Notification Routes
 * Notification management routes.
 */
const { Router } = require('express');
const { notificationController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { notificationValidator } = require('../validators');

const router = Router();

router.use(authenticate);

router.get('/', validate(notificationValidator.paginationSchema), notificationController.getNotifications);
router.get('/preferences', notificationController.getNotificationPreferences);
router.patch('/preferences', validate(notificationValidator.updateNotificationPreferencesSchema), notificationController.updateNotificationPreferences);
router.patch('/:notificationId/read', validate(notificationValidator.notificationIdParamSchema), notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', validate(notificationValidator.notificationIdParamSchema), notificationController.deleteNotification);

module.exports = router;
