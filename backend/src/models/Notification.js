/**
 * ExpenseFlow - Notification Model
 * User notifications for invitations, expense updates, settlements, and reminders.
 */
const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    // Denormalized fields so clients can render rich, self-contained cards
    // without extra lookups (actor name, circle, amount, currency).
    userName: {
      type: String,
      trim: true,
    },
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      trim: true,
    },
    data: {
      circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle' },
      expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
      settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },
      invitationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invitation' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number },
      actionUrl: { type: String },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // Auto-delete after 90 days

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;