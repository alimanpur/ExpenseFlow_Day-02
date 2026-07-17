/**
 * ExpenseFlow - Expense Model
 * Core expense tracking with multiple split methods and receipt support.
 */
const mongoose = require('mongoose');
const { SPLIT_METHODS, EXPENSE_STATUS } = require('../constants');

const expenseSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    splitMethod: {
      type: String,
      enum: Object.values(SPLIT_METHODS),
      default: SPLIT_METHODS.EQUAL,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      default: 'Other',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(EXPENSE_STATUS),
      default: EXPENSE_STATUS.PENDING,
    },
    receipts: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        filename: { type: String },
        mimetype: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringConfig: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
      },
      interval: { type: Number, default: 1 },
      endDate: { type: Date },
      nextOccurrence: { type: Date },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
expenseSchema.index({ circle: 1, date: -1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ circle: 1, isDeleted: 1 });
expenseSchema.index({ title: 'text', description: 'text', notes: 'text' });
expenseSchema.index({ 'recurringConfig.nextOccurrence': 1 }, { sparse: true });

// Virtual: splits
expenseSchema.virtual('splits', {
  ref: 'ExpenseSplit',
  localField: '_id',
  foreignField: 'expense',
});

// Instance method: Soft delete
expenseSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;