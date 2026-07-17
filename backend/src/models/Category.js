/**
 * ExpenseFlow - Category Model
 * Predefined and custom expense categories for organizing expenses.
 */
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      default: 'receipt',
    },
    color: {
      type: String,
      default: '#6366f1',
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid color hex code'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null, // null = global default category
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ name: 1, circle: 1 }, { unique: true });
categorySchema.index({ isDefault: 1 });
categorySchema.index({ circle: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;