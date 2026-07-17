/**
 * ExpenseFlow - Expense Service
 * Business logic for expense creation, splitting, and management.
 *
 * IDENTITY RESOLUTION: All financial references use canonical Circle Member._id.
 * User._id (from JWT) is resolved to Member._id at the entry point of each method.
 */
const mongoose = require('mongoose');
const { Expense, ExpenseSplit, Member, Circle, Transaction, User, ActivityLog, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { SPLIT_METHODS, ACTIVITY_TYPES, NOTIFICATION_TYPES } = require('../constants');
const splitEngine = require('./split.engine');
const { warn } = require('../utils/logger');
const { emitToCircle } = require('../socket');

/**
 * Fire-and-forget notification helpers. Notifications MUST never break the
 * primary financial workflow, so every call is wrapped in its own try/catch.
 * Services are required lazily to avoid load-order circular dependencies.
 */
async function notifyCircle(circleId, excludeUserId, type, title, message, data = {}, meta = {}) {
  try {
    const { notificationService } = require('./index');
    await notificationService.notifyCircleMembers(circleId, excludeUserId, type, title, message, data, meta);
  } catch (err) {
    warn('[expense.service] notifyCircle failed:', err.message);
  }
}

async function notifyUser(userId, type, title, message, data = {}, meta = {}) {
  try {
    const { notificationService } = require('./index');
    await notificationService.notifyUser(userId, type, title, message, data, meta);
  } catch (err) {
    warn('[expense.service] notifyUser failed:', err.message);
  }
}

class ExpenseService {
  /**
   * Create expense with splits
   *
   * IDENTITY FLOW:
   * 1. Resolve creator User._id → canonical Member._id for the circle
   * 2. Store Expense.paidBy = Member._id (canonical)
   * 3. Store ExpenseSplit.user = Member._id (canonical)
   */
  async createExpense(userId, data) {
    const { circleId, splits, ...expenseData } = data;

    const circle = await Circle.findById(circleId).select('isArchived isDeleted currency');
    if (!circle) throw ApiError.notFound('Circle not found');
    if (circle.isArchived) throw ApiError.badRequest('Archived circles cannot have new expenses');
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject all operations');

    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const creatorMemberId = member._id.toString();

    let payerId = expenseData.paidBy || creatorMemberId;

    // Resolve payerId to canonical Member._id regardless of whether
    // the caller sent User._id or Member._id.
    if (payerId !== creatorMemberId) {
      const resolvedPayer = await Member.findOne({
        circle: circleId,
        $or: [{ user: payerId }, { _id: payerId }],
        isActive: true,
      });
      if (resolvedPayer) {
        payerId = resolvedPayer._id.toString();
      }
    }
    const payerMember = await Member.findOne({
      circle: circleId,
      $or: [{ user: payerId }, { _id: payerId }],
      isActive: true,
    });
    if (!payerMember) throw ApiError.badRequest('Payer must be an active member of this circle');

    const normalizedSplits = splits.map((s) => ({ user: s.user, percentage: s.percentage, amount: s.amount, shares: s.shares }));
    const splitResult = splitEngine.calculate(expenseData.amount, expenseData.splitMethod || SPLIT_METHODS.EQUAL, normalizedSplits);

    const [expense] = await Expense.create([
      {
        ...expenseData,
        circle: circleId,
        paidBy: payerId,
        splitMethod: expenseData.splitMethod || SPLIT_METHODS.EQUAL,
        currency: circle.currency,
      },
    ]);

    const expenseSplits = splitResult.splits.map((split) => ({
      expense: expense._id,
      user: split.user,
      amount: split.amount,
      percentage: split.percentage || null,
      shares: split.shares || 1,
    }));

    await ExpenseSplit.insertMany(expenseSplits);

    await Transaction.create({
      circle: circleId,
      type: 'expense',
      referenceId: expense._id,
      referenceModel: 'Expense',
      from: expense.paidBy,
      to: expense.paidBy,
      amount: expense.amount,
      currency: expense.currency || 'USD',
      description: `Expense: ${expense.title}`,
      status: 'completed',
    });

    const { activityService } = require('./index');
    await activityService.createActivity(
      circleId,
      userId,
      ACTIVITY_TYPES.EXPENSE_CREATED,
      `Expense "${expense.title}" created for ${expense.currency || 'USD'} ${expense.amount}`,
      { expenseId: expense._id, amount: expense.amount }
    );

    const payerDoc = await Member.findById(expense.paidBy).populate('user', 'name').lean();
    const payerName = payerDoc?.user?.name || payerDoc?.displayName || 'A user';
    const currency = expense.currency || 'USD';
    const amount = expense.amount;

    await notifyCircle(
      circleId,
      expense.paidBy,
      NOTIFICATION_TYPES.EXPENSE_ADDED,
      `New expense in ${circle.name}`,
      `${payerName} added "${expense.title}" for ${currency} ${amount}`,
      { expenseId: expense._id, circleId, amount, currency },
      { userName: payerName, amount, currency }
    );

    if (amount >= 1000) {
      await notifyUser(
        expense.paidBy,
        NOTIFICATION_TYPES.LARGE_EXPENSE,
        'Large expense recorded',
        `You recorded a large expense "${expense.title}" for ${currency} ${amount} in ${circle.name}`,
        { expenseId: expense._id, circleId, amount, currency },
        { userName: payerName, amount, currency }
      );
    }

    try {
      emitToCircle(circleId, 'expense:created', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: expense.paidBy,
        circleId,
        createdBy: userId,
      });
    } catch (err) {
      warn('[expense.service] socket emit failed:', err.message);
    }

    await this.recalculateExpenseStatuses(circleId);

    return this.getExpense(expense._id.toString(), userId);
  }

  /**
   * Get expense by ID
   */
  async getExpense(expenseId, userId) {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false })
      .populate({
        path: 'paidBy',
        select: 'displayName nickname user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate({
        path: 'splits',
        populate: {
          path: 'user',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        },
      })
      .populate('category', 'name icon color')
      .populate('circle', 'name');

    if (!expense) throw ApiError.notFound('Expense not found');

    const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const circleMembers = await Member.find({ circle: expense.circle, isActive: true, isDeleted: false })
      .populate('user', 'name email avatar')
      .lean();

    const memberMap = {};
    circleMembers.forEach(m => {
      const memberId = m._id.toString();
      const userPartId = m.user?._id?.toString() || (m.user?.toString?.() || null);
      const name = m.user?.name || m.displayName || 'Guest';
      const email = m.user?.email || '';
      const avatar = m.user?.avatar || null;
      memberMap[memberId] = { name, email, avatar, isGuest: m.isGuest };
      if (userPartId) memberMap[userPartId] = { name, email, avatar, isGuest: m.isGuest };
    });

    const expenseObj = expense.toObject({ virtuals: true });

    if (expenseObj.paidBy) {
      const paidById = expense.paidBy.toString();
      const paidByData = memberMap[paidById];
      if (paidByData) {
        expenseObj.paidBy = {
          ...paidByData,
          _id: expense.paidBy,
          name: paidByData.name,
          email: paidByData.email,
          avatar: paidByData.avatar,
        };
      } else if (!expenseObj.paidBy.name) {
        expenseObj.paidBy = {
          ...expenseObj.paidBy,
          name: 'A user',
          email: '',
          avatar: null,
        };
      }
    }

    if (expenseObj.splits) {
      expenseObj.splits = expenseObj.splits.map(split => {
        const splitUserId = split.user?.toString();
        const memberData = splitUserId ? memberMap[splitUserId] : null;

        if (memberData) {
          split.user = {
            ...memberData,
            _id: split.user,
            name: memberData.name,
            email: memberData.email,
            avatar: memberData.avatar,
          };
        } else if (split.user && !split.user.name) {
          split.user = {
            ...split.user,
            name: 'A user',
            email: '',
            avatar: null,
          };
        }
        return split;
      });
    }

    return expenseObj;
  }

  /**
   * Get expenses for a circle
   */
  async getCircleExpenses(circleId, userId, query = {}) {
    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const { page = 1, limit = 20, category, startDate, endDate, search, status } = query;
    const skip = (page - 1) * limit;

    const filter = { circle: circleId, isDeleted: false };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'paidBy',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        })
        .populate('category', 'name icon color'),
      Expense.countDocuments(filter),
    ]);

    return {
      expenses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update expense
   *
   * IDENTITY: Compare stored paidBy (canonical Member._id) against resolved memberId.
   */
  async updateExpense(expenseId, userId, data) {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) throw ApiError.notFound('Expense not found');

    const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const memberId = member._id.toString();

    if (expense.paidBy.toString() !== memberId) {
      throw ApiError.forbidden('Only the payer can update this expense');
    }

    const allowedFields = ['title', 'description', 'amount', 'category', 'date', 'notes', 'tags'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) expense[field] = data[field];
    });

    await expense.save();

    const circle = await Circle.findById(expense.circle).select('name').lean();
    const actor = await User.findById(userId).select('name').lean();
    const actorName = actor?.name || 'A user';
    await notifyCircle(
      expense.circle,
      userId,
      NOTIFICATION_TYPES.EXPENSE_UPDATED,
      `Expense updated in ${circle?.name || 'a circle'}`,
      `${actorName} edited "${expense.title}"`,
      { expenseId: expense._id, circleId: expense.circle, amount: expense.amount, currency: expense.currency },
      { userName: actorName, amount: expense.amount, currency: expense.currency }
    );

    try {
      emitToCircle(expense.circle, 'expense:updated', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        circleId: expense.circle,
        updatedBy: userId,
      });
    } catch (err) {
      warn('[expense.service] socket emit failed:', err.message);
    }

    await this.recalculateExpenseStatuses(expense.circle);

    return await expense.populate([
      { path: 'paidBy', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      { path: 'splits', populate: { path: 'user', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } } },
      { path: 'category', select: 'name icon color' },
    ]);
  }

  /**
   * Delete expense (soft delete)
   */
  async deleteExpense(expenseId, userId) {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) throw ApiError.notFound('Expense not found');

    const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const memberId = member._id.toString();

    if (expense.paidBy.toString() !== memberId) {
      throw ApiError.forbidden('Only the payer can delete this expense');
    }

    await expense.softDelete(userId);

    const circle = await Circle.findById(expense.circle).select('name').lean();
    const actor = await User.findById(userId).select('name').lean();
    const actorName = actor?.name || 'A user';
    await notifyCircle(
      expense.circle,
      userId,
      NOTIFICATION_TYPES.EXPENSE_DELETED,
      `Expense deleted in ${circle?.name || 'a circle'}`,
      `${actorName} deleted "${expense.title}"`,
      { expenseId: expense._id, circleId: expense.circle, amount: expense.amount, currency: expense.currency },
      { userName: actorName, amount: expense.amount, currency: expense.currency }
    );

    try {
      emitToCircle(expense.circle, 'expense:deleted', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        circleId: expense.circle,
        deletedBy: userId,
      });
    } catch (err) {
      warn('[expense.service] socket emit failed:', err.message);
    }

    await this.recalculateExpenseStatuses(expense.circle);
  }

  /**
   * Restore expense (undo soft delete)
   */
  async restoreExpense(expenseId, userId) {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: true });
    if (!expense) throw ApiError.notFound('Expense not found');

    const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const memberId = member._id.toString();

    if (expense.paidBy.toString() !== memberId) {
      throw ApiError.forbidden('Only the payer can restore this expense');
    }

    expense.isDeleted = false;
    expense.deletedAt = null;
    expense.deletedBy = null;
    await expense.save();

    const circle = await Circle.findById(expense.circle).select('name').lean();
    const actor = await User.findById(userId).select('name').lean();
    const actorName = actor?.name || 'A user';
    await notifyCircle(
      expense.circle,
      userId,
      NOTIFICATION_TYPES.EXPENSE_CREATED,
      `Expense restored in ${circle?.name || 'a circle'}`,
      `${actorName} restored "${expense.title}"`,
      { expenseId: expense._id, circleId: expense.circle, amount: expense.amount, currency: expense.currency },
      { userName: actorName, amount: expense.amount, currency: expense.currency }
    );

    try {
      emitToCircle(expense.circle, 'expense:restored', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        circleId: expense.circle,
        restoredBy: userId,
      });
    } catch (err) {
      warn('[expense.service] socket emit failed:', err.message);
    }

    await this.recalculateExpenseStatuses(expense.circle);
  }

  /**
   * Get user's expenses across all circles
   *
   * IDENTITY: Resolve User._id → all Member._ids, then query by Member._ids
   * because Expense.paidBy stores canonical Member._id.
   */
  async getUserExpenses(userId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const members = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
    const memberIds = members.map((m) => m._id.toString());
    const circleIds = members.map((m) => m.circle);

    const filter = {
      paidBy: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
      circle: { $in: circleIds },
      isDeleted: false,
    };

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('circle', 'name')
        .populate({
          path: 'paidBy',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        }),
      Expense.countDocuments(filter),
    ]);

    return {
      expenses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all expenses across all user's circles with advanced filtering
   * Master endpoint for Entries Management Center
   */
  async getAllExpenses(userId, query = {}) {
    const members = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
    const circleIds = members.map((m) => m.circle);

    const {
      page = 1,
      limit = 20,
      search,
      circleId,
      category,
      paidBy,
      participant,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      splitMethod,
      status,
      isArchived,
      hasReceipt,
      currency,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Base filter - user's circles
    const filter = {
      circle: { $in: circleIds },
    };

    // Search across title, description, notes, payer name, participant names
    const orConditions = [];
    if (search) {
      orConditions.push(
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      );
    }

    // Circle filter
    if (circleId) {
      filter.circle = circleId;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Paid by filter
    if (paidBy) {
      filter.paidBy = paidBy;
    }

    // Date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Amount range
    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.amount = {};
      if (minAmount !== undefined) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount !== undefined) filter.amount.$lte = parseFloat(maxAmount);
    }

    // Split method
    if (splitMethod) {
      filter.splitMethod = splitMethod;
    }

    // Status
    if (status) {
      filter.status = status;
    }

    // Archived status
    if (isArchived !== undefined) {
      filter.isDeleted = isArchived === 'true' || isArchived === true;
    } else {
      filter.isDeleted = false; // Default to non-deleted
    }

    // Receipt filter
    if (hasReceipt !== undefined) {
      if (hasReceipt === 'true' || hasReceipt === true) {
        filter.receipts = { $exists: true, $ne: [] };
      } else {
        orConditions.push(
          { receipts: { $exists: false } },
          { receipts: [] }
        );
      }
    }

    // Currency filter
    if (currency) {
      filter.currency = currency;
    }

    // Apply combined $or conditions
    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }

    // Participant filter - find expenses where user is a participant
    if (participant) {
      const participantExpenses = await ExpenseSplit.find({ user: participant }).distinct('expense');
      filter._id = { $in: participantExpenses };
    }

    // Sorting
    const sortMap = {
      'date': 'date',
      'amount': 'amount',
      'title': 'title',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
    };
    const sortField = sortMap[sortBy] || 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate('circle', 'name currency')
        .populate({
          path: 'paidBy',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        }),
      Expense.countDocuments(filter),
    ]);

    return {
      expenses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get expense statistics across all user's circles
   */
  async getExpenseStatistics(userId) {
    const members = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
    const circleIds = members.map((m) => m.circle);

    const baseFilter = {
      circle: { $in: circleIds },
      isDeleted: false,
    };

    const [
      totalExpenses,
      thisMonthExpenses,
      pendingSettlement,
      totalAmount,
      thisMonthAmount,
      activeCircles,
      receiptsUploaded,
      archivedExpenses,
      byCategory,
      byCircle,
      byCurrency,
    ] = await Promise.all([
      // Total expenses count
      Expense.countDocuments(baseFilter),
      
      // This month's expenses
      Expense.countDocuments({
        ...baseFilter,
        date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      
      // Pending settlement amount (sum of unsettled expenses)
      Expense.aggregate([
        { $match: { ...baseFilter, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Total amount
      Expense.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // This month amount
      Expense.aggregate([
        {
          $match: {
            ...baseFilter,
            date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Active circles count
      Circle.countDocuments({
        _id: { $in: circleIds },
        isArchived: false,
        isDeleted: false,
      }),
      
      // Receipts uploaded
      Expense.countDocuments({
        ...baseFilter,
        receipts: { $exists: true, $ne: [] },
      }),
      
      // Archived expenses
      Expense.countDocuments({
        circle: { $in: circleIds },
        isDeleted: true,
      }),
      
      // By category
      Expense.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$category', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ]),
      
      // By circle
      Expense.aggregate([
        { $match: baseFilter },
        {
          $lookup: {
            from: 'circles',
            localField: 'circle',
            foreignField: '_id',
            as: 'circleData',
          },
        },
        { $unwind: '$circleData' },
        {
          $group: {
            _id: '$circle',
            name: { $first: '$circleData.name' },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      
      // By currency
      Expense.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const pendingAmount = pendingSettlement[0]?.total || 0;
    const totalAmt = totalAmount[0]?.total || 0;
    const thisMonthAmt = thisMonthAmount[0]?.total || 0;
    const averageExpense = totalExpenses > 0 ? totalAmt / totalExpenses : 0;

    return {
      totalExpenses,
      thisMonthExpenses,
      pendingSettlementAmount: pendingAmount,
      totalAmount: totalAmt,
      thisMonthAmount: thisMonthAmt,
      averageExpense,
      activeCircles,
      receiptsUploaded,
      archivedExpenses,
      byCategory: byCategory.map(item => ({
        category: item._id,
        count: item.count,
        amount: item.amount,
      })),
      byCircle: byCircle.map(item => ({
        circleId: item._id,
        name: item.name,
        count: item.count,
        amount: item.amount,
      })),
      byCurrency: byCurrency.map(item => ({
        currency: item._id,
        count: item.count,
        amount: item.amount,
      })),
    };
  }

  /**
   * Search expenses globally across all user's circles
   */
  async searchExpenses(userId, query = {}) {
    const { q, limit = 20 } = query;
    
    if (!q || q.trim().length < 2) {
      return { expenses: [], total: 0 };
    }

    const members = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
    const circleIds = members.map((m) => m.circle);

    const filter = {
      circle: { $in: circleIds },
      isDeleted: false,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ],
    };

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .populate('circle', 'name currency')
        .populate({
          path: 'paidBy',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        })
        .populate('category', 'name icon color')
        .populate({
          path: 'splits',
          populate: {
            path: 'user',
            select: 'displayName nickname user',
            populate: { path: 'user', select: 'name email avatar' },
          },
        }),
      Expense.countDocuments(filter),
    ]);

    return {
      expenses,
      total,
    };
  }

  /**
   * Get expense timeline/activity log
   */
  async getExpenseTimeline(expenseId, userId) {
    const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
    if (!expense) throw ApiError.notFound('Expense not found');

    // Verify user has access
    const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    // Get activity logs for this expense
    const activityLogs = await ActivityLog.find({
      circle: expense.circle,
      'metadata.expenseId': expenseId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get audit logs for this expense
    const auditLogs = await AuditLog.find({
      resourceType: 'Expense',
      resourceId: expenseId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Combine and sort by date
    const timeline = [
      ...activityLogs.map(log => ({
        type: 'activity',
        action: log.action,
        description: log.description,
        userId: log.userId,
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
      ...auditLogs.map(log => ({
        type: 'audit',
        action: log.action,
        description: log.description,
        userId: log.userId,
        createdAt: log.createdAt,
        changes: log.changes,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return timeline;
  }

  /**
   * Bulk delete expenses
   */
  async bulkDeleteExpenses(expenseIds, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const expenseId of expenseIds) {
      try {
        await this.deleteExpense(expenseId, userId);
        results.success.push(expenseId);
      } catch (error) {
        results.failed.push({ id: expenseId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk archive expenses
   */
  async bulkArchiveExpenses(expenseIds, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const expenseId of expenseIds) {
      try {
        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
          results.failed.push({ id: expenseId, error: 'Expense not found' });
          continue;
        }

        const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
        if (!member) {
          results.failed.push({ id: expenseId, error: 'Not a member of circle' });
          continue;
        }

        const memberId = member._id.toString();
        if (expense.paidBy.toString() !== memberId) {
          results.failed.push({ id: expenseId, error: 'Only payer can archive' });
          continue;
        }

        expense.isDeleted = true;
        expense.deletedAt = new Date();
        expense.deletedBy = userId;
        await expense.save();

        results.success.push(expenseId);

        // Emit socket event
        try {
          emitToCircle(expense.circle, 'expense:deleted', {
            expenseId: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            circleId: expense.circle,
            deletedBy: userId,
          });
        } catch (err) {
          warn('[expense.service] socket emit failed:', err.message);
        }
      } catch (error) {
        results.failed.push({ id: expenseId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk restore expenses
   */
  async bulkRestoreExpenses(expenseIds, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const expenseId of expenseIds) {
      try {
        const expense = await Expense.findOne({ _id: expenseId, isDeleted: true });
        if (!expense) {
          results.failed.push({ id: expenseId, error: 'Expense not found or not deleted' });
          continue;
        }

        const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
        if (!member) {
          results.failed.push({ id: expenseId, error: 'Not a member of circle' });
          continue;
        }

        const memberId = member._id.toString();
        if (expense.paidBy.toString() !== memberId) {
          results.failed.push({ id: expenseId, error: 'Only payer can restore' });
          continue;
        }

        expense.isDeleted = false;
        expense.deletedAt = null;
        expense.deletedBy = null;
        await expense.save();

        results.success.push(expenseId);

        // Emit socket event
        try {
          emitToCircle(expense.circle, 'expense:restored', {
            expenseId: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            circleId: expense.circle,
            restoredBy: userId,
          });
        } catch (err) {
          warn('[expense.service] socket emit failed:', err.message);
        }
      } catch (error) {
        results.failed.push({ id: expenseId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk update expense category
   */
  async bulkUpdateCategory(expenseIds, category, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const expenseId of expenseIds) {
      try {
        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
          results.failed.push({ id: expenseId, error: 'Expense not found' });
          continue;
        }

        const member = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
        if (!member) {
          results.failed.push({ id: expenseId, error: 'Not a member of circle' });
          continue;
        }

        const memberId = member._id.toString();
        if (expense.paidBy.toString() !== memberId) {
          results.failed.push({ id: expenseId, error: 'Only payer can update' });
          continue;
        }

        expense.category = category;
        await expense.save();

        results.success.push(expenseId);

        // Emit socket event
        try {
          emitToCircle(expense.circle, 'expense:updated', {
            expenseId: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            circleId: expense.circle,
            updatedBy: userId,
          });
        } catch (err) {
          warn('[expense.service] socket emit failed:', err.message);
        }
      } catch (error) {
        results.failed.push({ id: expenseId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk move expenses to another circle
   */
  async bulkMoveToCircle(expenseIds, targetCircleId, userId) {
    const results = {
      success: [],
      failed: [],
    };

    // Verify target circle exists and user is a member
    const targetCircle = await Circle.findById(targetCircleId);
    if (!targetCircle) {
      return { success: [], failed: expenseIds.map(id => ({ id, error: 'Target circle not found' })) };
    }

    const targetMember = await Member.findOne({ user: userId, circle: targetCircleId, isActive: true });
    if (!targetMember) {
      return { success: [], failed: expenseIds.map(id => ({ id, error: 'Not a member of target circle' })) };
    }

    for (const expenseId of expenseIds) {
      try {
        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
          results.failed.push({ id: expenseId, error: 'Expense not found' });
          continue;
        }

        const sourceMember = await Member.findOne({ user: userId, circle: expense.circle, isActive: true });
        if (!sourceMember) {
          results.failed.push({ id: expenseId, error: 'Not a member of source circle' });
          continue;
        }

        const sourceMemberId = sourceMember._id.toString();
        if (expense.paidBy.toString() !== sourceMemberId) {
          results.failed.push({ id: expenseId, error: 'Only payer can move' });
          continue;
        }

        const oldCircleId = expense.circle;
        expense.circle = targetCircleId;
        expense.currency = targetCircle.currency; // Update to target circle currency
        await expense.save();

        results.success.push(expenseId);

        // Emit socket events for both circles
        try {
          emitToCircle(oldCircleId, 'expense:updated', {
            expenseId: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            circleId: oldCircleId,
            updatedBy: userId,
          });
          emitToCircle(targetCircleId, 'expense:created', {
            expenseId: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            circleId: targetCircleId,
            createdBy: userId,
          });
        } catch (err) {
          warn('[expense.service] socket emit failed:', err.message);
        }
      } catch (error) {
        results.failed.push({ id: expenseId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Export expenses in various formats
   */
  async exportExpenses(userId, format = 'csv', filters = {}) {
    const { expenses } = await this.getAllExpenses(userId, { ...filters, limit: 10000, page: 1 });

    if (format === 'json') {
      return JSON.stringify(expenses, null, 2);
    }

    if (format === 'csv') {
      const headers = ['Date', 'Title', 'Circle', 'Paid By', 'Amount', 'Currency', 'Category', 'Status', 'Split Method'];
      const rows = expenses.map(e => [
        new Date(e.date).toISOString().split('T')[0],
        e.title,
        e.circle?.name || '',
        e.paidBy?.name || '',
        e.amount,
        e.currency,
        e.category,
        e.status,
        e.splitMethod,
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    if (format === 'excel') {
      // Return structured data for Excel export
      return {
        headers: ['Date', 'Title', 'Circle', 'Paid By', 'Amount', 'Currency', 'Category', 'Status', 'Split Method'],
        data: expenses.map(e => [
          new Date(e.date).toISOString().split('T')[0],
          e.title,
          e.circle?.name || '',
          e.paidBy?.name || '',
          e.amount,
          e.currency,
          e.category,
          e.status,
          e.splitMethod,
        ]),
      };
    }

    // PDF would require additional library - return data for now
    return {
      format: 'pdf',
      data: expenses,
      message: 'PDF generation requires additional implementation',
    };
  }

  /**
   * Recalculate expense statuses for a circle based on the current
   * settlement state. This is called after settlement mutations so that
   * the entry list reflects the true state of repayment without requiring
   * a per-expense settlement reference.
   *
   * Rules:
   *  - settled        : payer's net balance in the circle is <= 0 (fully repaid)
   *  - partially_settled : payer's net > 0 but the circle has completed settlements
   *  - pending        : payer's net > 0 and no completed settlements yet
   */
  async recalculateExpenseStatuses(circleId) {
    const expenses = await Expense.find({ circle: circleId, isDeleted: false }).lean();
    if (expenses.length === 0) return;

    const { EXPENSE_STATUS } = require('../constants');
    const financialEngine = require('./financial.engine');
    const summary = await financialEngine.getCircleSummary(circleId);

    const netByPayer = {};
    (summary.memberBalances || []).forEach(b => {
      netByPayer[b.userId] = b.netBalance;
    });

    const hasCompletedSettlements = (summary.completedSettlements || []).length > 0;

    const ops = expenses.map(e => {
      const payerId = e.paidBy ? e.paidBy.toString() : null;
      const net = payerId ? (netByPayer[payerId] || 0) : 0;
      let status = EXPENSE_STATUS.PENDING;
      if (net <= 0) {
        status = EXPENSE_STATUS.SETTLED;
      } else if (hasCompletedSettlements) {
        status = EXPENSE_STATUS.PARTIALLY_SETTLED;
      }
      return {
        updateOne: {
          filter: { _id: e._id, status: { $ne: EXPENSE_STATUS.CANCELLED } },
          update: { $set: { status } },
        },
      };
    });

    if (ops.length > 0) {
      await Expense.bulkWrite(ops, { ordered: false });
    }
  }
}

module.exports = new ExpenseService();
