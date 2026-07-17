/**
 * ExpenseFlow - Settlement Model
 * Tracks payment settlements between users within circles.
 */
const mongoose = require('mongoose');
const { SETTLEMENT_STATUS, PAYMENT_METHODS } = require('../constants');

const settlementSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Settlement amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_STATUS),
      default: SETTLEMENT_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.OTHER,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    confirmedByReceiver: {
      type: Boolean,
      default: false,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    remainingAmount: {
      type: Number,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

settlementSchema.index({ circle: 1, status: 1 });
settlementSchema.index({ from: 1, status: 1 });
settlementSchema.index({ to: 1, status: 1 });
settlementSchema.index({ circle: 1, from: 1, to: 1 });

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;