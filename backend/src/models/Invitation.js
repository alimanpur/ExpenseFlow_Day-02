/**
 * ExpenseFlow - Invitation Model
 * Manages circle invitations sent to users via email.
 */
const mongoose = require('mongoose');
const { INVITATION_STATUS } = require('../constants');

const invitationSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedEmail: {
      type: String,
      required: [true, 'Invited email is required'],
      lowercase: true,
      trim: true,
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: {
      type: String,
      default: 'member',
    },
    status: {
      type: String,
      enum: Object.values(INVITATION_STATUS),
      default: INVITATION_STATUS.PENDING,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ circle: 1, status: 1 });
invitationSchema.index({ invitedEmail: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method: Check if expired
invitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() || this.status === INVITATION_STATUS.EXPIRED;
};

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;