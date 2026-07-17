/**
 * ExpenseFlow - Notification Service
 * Handles creation and management of user notifications.
 */
const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');

class NotificationService {
  /**
   * Create a notification
   */
  async create(userId, type, title, message, data = {}) {
    return Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });
  }

  /**
   * Get user notifications with pagination
   * Returns notifications in a shape the frontend expects:
   * { id, actorName, text, kind, groupId, amount, currency, time, read }
   */
  async getUserNotifications(userId, query = {}) {
    const { page = 1, limit = 20, unread, type } = query;
    const skip = (page - 1) * limit;

    const filter = { user: userId, isDeleted: false };
    if (unread === 'true') filter.isRead = false;
    if (type) filter.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false, isDeleted: false }),
    ]);

    const kindMap = {
      invitation_received: 'join',
      invitation_accepted: 'join',
      invitation_declined: 'join',
      expense_added: 'expense',
      expense_updated: 'expense',
      expense_deleted: 'expense',
      settlement_due: 'settlement',
      settlement_completed: 'settlement',
      settlement_confirmed: 'settlement',
      member_added: 'join',
      member_removed: 'join',
      guest_registered: 'join',
      group_updated: 'note',
      payment_received: 'payment',
      large_expense: 'expense',
      settlement_suggested: 'settlement',
      monthly_summary: 'note',
      circle_archived: 'note',
      reminder: 'reminder',
    };

    const mapped = notifications.map(n => ({
      id: n._id.toString(),
      actorName: n.userName || 'Someone',
      text: n.message || '',
      kind: kindMap[n.type] || 'note',
      groupId: n.circleId ? n.circleId.toString() : null,
      amount: n.amount,
      currency: n.currency,
      time: n.createdAt,
      read: n.isRead,
    }));

    return {
      notifications: mapped,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get notification preferences for user
   */
  async getNotificationPreferences(userId) {
    const user = await require('../models').User.findById(userId).select('preferences');
    if (!user) throw ApiError.notFound('User not found');
    return user.preferences?.notifications || { email: true, push: true, sms: false };
  }

  /**
   * Update notification preferences for user
   */
  async updateNotificationPreferences(userId, updates) {
    const { User } = require('../models');
    const allowedFields = ['email', 'push', 'sms'];
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[`preferences.notifications.${field}`] = updates[field];
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: filteredUpdates }, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    return user.preferences?.notifications || { email: true, push: true, sms: false };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return null;
    return notification;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Delete notification (soft delete)
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isDeleted: true },
      { new: true }
    );
    if (!notification) return null;
    return notification;
  }

  /**
   * Create notification for circle members
   * @param {string} circleId - circle the action happened in
   * @param {string} excludeUserId - actor to skip (they performed the action)
   * @param {string} type - NOTIFICATION_TYPES value
   * @param {string} title
   * @param {string} message
   * @param {object} data - structured payload (expenseId, settlementId, amount, etc.)
   * @param {object} meta - denormalized display fields: { userName, amount, currency }
   */
  async notifyCircleMembers(circleId, excludeUserId, type, title, message, data = {}, meta = {}) {
    const { Member, User } = require('../models');
    const members = await Member.find({
      circle: circleId,
      isActive: true,
      user: { $ne: excludeUserId, $nin: [null] },
    });

    if (members.length === 0) return;

    // Fetch preferences for all members in one query
    const userIds = members.map(m => m.user);
    const users = await User.find({ _id: { $in: userIds } }).select('preferences').lean();
    const prefsByUserId = {};
    users.forEach(u => {
      prefsByUserId[String(u._id)] = u?.preferences?.notifications || { email: true, push: true, sms: false };
    });

    const notifications = members
      .map((member) => {
        const prefs = prefsByUserId[String(member.user)] || { email: true, push: true, sms: false };
        const anyEnabled = prefs.email || prefs.push || prefs.sms;
        if (!anyEnabled) return null;
        return {
          user: member.user,
          type,
          title,
          message,
          userName: meta.userName || '',
          circleId,
          amount: typeof data.amount === 'number' ? data.amount : (typeof meta.amount === 'number' ? meta.amount : undefined),
          currency: data.currency || meta.currency || undefined,
          data: {
            circleId,
            amount: typeof data.amount === 'number' ? data.amount : undefined,
            currency: data.currency || meta.currency,
            ...data,
          },
        };
      })
      .filter(Boolean);

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }

  /**
   * Create a notification for a single user (used for reminders, large-expense
   * alerts, monthly summaries, settlement confirmations to the involved party).
   * Respects the recipient's notification preferences: if all channels are
   * disabled, the notification is not created.
   */
  async notifyUser(userId, type, title, message, data = {}, meta = {}) {
    const { User } = require('../models');
    const user = await User.findById(userId).select('preferences').lean();
    const prefs = user?.preferences?.notifications || { email: true, push: true, sms: false };
    const anyChannelEnabled = prefs.email || prefs.push || prefs.sms;
    if (!anyChannelEnabled) return null;

    return Notification.create({
      user: userId,
      type,
      title,
      message,
      userName: meta.userName || '',
      circleId: data.circleId || undefined,
      amount: typeof data.amount === 'number' ? data.amount : (typeof meta.amount === 'number' ? meta.amount : undefined),
      currency: data.currency || meta.currency || undefined,
      data: {
        circleId: data.circleId,
        amount: typeof data.amount === 'number' ? data.amount : undefined,
        currency: data.currency || meta.currency,
        ...data,
      },
    });
  }
}

module.exports = new NotificationService();