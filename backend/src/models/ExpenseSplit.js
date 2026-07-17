/**
 * ExpenseFlow - ExpenseSplit Model
 * Individual share allocations for each expense.
 */
const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema(
  {
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Split amount is required'],
      min: [0, 'Split amount cannot be negative'],
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    shares: {
      type: Number,
      min: 1,
      default: 1,
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledAt: {
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

expenseSplitSchema.index({ expense: 1, user: 1 }, { unique: true });
expenseSplitSchema.index({ user: 1, isSettled: 1 });

const ExpenseSplit = mongoose.model('ExpenseSplit', expenseSplitSchema);

module.exports = ExpenseSplit;