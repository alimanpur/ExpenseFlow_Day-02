/**
 * ExpenseFlow - ActivityLog Model
 * Tracks all user activities within circles for the activity feed.
 */
const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../constants');

const activityLogSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
      settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
      targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number },
      oldValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
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

activityLogSchema.index({ circle: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ type: 1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // Auto-delete after 1 year

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;