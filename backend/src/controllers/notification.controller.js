/**
 * ExpenseFlow - Notification Controller
 * HTTP request handlers for notification management.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { notificationService } = require('../services');

const getNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.userId, req.query);
  ApiResponse.success('Notifications retrieved', result.notifications, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
    unreadCount: result.unreadCount,
  }).send(res);
});

const getNotificationPreferences = catchAsync(async (req, res) => {
  const preferences = await notificationService.getNotificationPreferences(req.userId);
  ApiResponse.success('Notification preferences retrieved', preferences).send(res);
});

const updateNotificationPreferences = catchAsync(async (req, res) => {
  const preferences = await notificationService.updateNotificationPreferences(req.userId, req.body);
  ApiResponse.success('Notification preferences updated', preferences).send(res);
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.notificationId, req.userId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }
  ApiResponse.success('Notification marked as read', notification).send(res);
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.userId);
  ApiResponse.success('All notifications marked as read').send(res);
});

const deleteNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.deleteNotification(req.params.notificationId, req.userId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }
  ApiResponse.success('Notification deleted').send(res);
});

module.exports = {
  getNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
