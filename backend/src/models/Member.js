/**
 * ExpenseFlow - Member Model
 * Tracks membership and roles within circles.
 * Supports both registered users (via user ref) and name-only/guest members.
 *
 * NOTE: Per the Financial Engine Specification, financial balances (totalPaid,
 * totalOwed, netBalance) are DERIVED values computed on-demand via aggregation.
 * They are NOT stored on the Member document. Use FinancialEngine to compute them.
 */
const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for name-only members without an account
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null, // populated for name-only (guest) members
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: false, // true for name-only members without an account
    },
    status: {
      type: String,
      enum: ['guest', 'pending_invitation', 'registered', 'removed'],
      default: 'guest',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    leftAt: {
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index — partial to allow multiple null user entries (guest members)
memberSchema.index({ user: 1, circle: 1 }, { unique: true, partialFilterExpression: { user: { $ne: null } } });
memberSchema.index({ circle: 1, role: 1 });
memberSchema.index({ user: 1, isActive: 1 });
memberSchema.index({ circle: 1, isActive: 1 });
memberSchema.index({ circle: 1, displayName: 1 });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
