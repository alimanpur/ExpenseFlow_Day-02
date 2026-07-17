/**
 * ExpenseFlow - Circle (Group) Model
 * Groups that users create to share and split expenses.
 */
const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Circle name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    coverImage: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
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
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    maxMembers: {
      type: Number,
      default: 50,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
circleSchema.index({ owner: 1 });
circleSchema.index({ isArchived: 1, isDeleted: 1 });
circleSchema.index({ name: 'text', description: 'text' });

// Virtual: active members count
circleSchema.virtual('activeMembersCount', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'circle',
  match: { isActive: true, isDeleted: false },
  count: true,
});

// Virtual: members list
circleSchema.virtual('members', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'circle',
  match: { isActive: true, isDeleted: false },
});

// Virtual: recent expenses (last 10)
circleSchema.virtual('recentExpenses', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  options: {
    sort: { date: -1 },
    limit: 10,
  },
});

// Virtual: settlements
circleSchema.virtual('settlements', {
  ref: 'Settlement',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  options: {
    sort: { createdAt: -1 },
  },
});

// Virtual: activity
circleSchema.virtual('activity', {
  ref: 'ActivityLog',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  options: {
    sort: { createdAt: -1 },
  },
});

// Virtual: total spent (sum of all non-deleted expenses)
circleSchema.virtual('totalSpent', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  count: false,
});

// Virtual: expense count
circleSchema.virtual('expenseCount', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  count: true,
});

// Virtual: last activity date
circleSchema.virtual('lastActivity', {
  ref: 'ActivityLog',
  localField: '_id',
  foreignField: 'circle',
  match: { isDeleted: false },
  options: {
    sort: { createdAt: -1 },
    limit: 1,
  },
});

// Instance method: soft delete
circleSchema.methods.softDelete = async function (deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  await this.save();
};

// Instance method: archive
circleSchema.methods.archive = async function (archivedByUserId) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = archivedByUserId;
  await this.save();
};

// Instance method: unarchive
circleSchema.methods.unarchive = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  this.archivedBy = null;
  await this.save();
};

// Pre-find middleware to populate computed fields
circleSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'totalSpent',
    select: 'amount',
    options: { lean: true },
  });
  next();
});

const Circle = mongoose.model('Circle', circleSchema);

module.exports = Circle;
