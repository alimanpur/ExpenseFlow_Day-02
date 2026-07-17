/**
 * ExpenseFlow - Analytics Service
 * Analytics APIs for dashboards and insights.
 */
const { Expense, Settlement, Circle, Transaction } = require('../models');
const { roundTo } = require('../utils/helpers');
const { ActivityLog } = require('../models');
const financialEngine = require('./financial.engine');

class AnalyticsService {
  async getMonthlySpending(userId, circleId, year, month) {
    year = parseInt(year, 10) || new Date().getFullYear();
    month = parseInt(month, 10) || new Date().getMonth() + 1;
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await Expense.find({
      circle: { $in: circleIds },
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('circle', 'name currency').populate('paidBy', 'name email');

    const totalSpent = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const expenseCount = expenses.length;

    const categoryMap = {};
    for (const expense of expenses) {
      const cat = expense.category?.toString() || 'uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, total: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].total = roundTo(categoryMap[cat].total + expense.amount);
    }

    return {
      totalSpent,
      expenseCount,
      period: { year, month },
      categories: categoryMap,
      expenses: expenses.slice(0, 50),
    };
  }

  async getWeeklySpending(userId, circleId, year, month) {
    year = parseInt(year, 10) || new Date().getFullYear();
    month = parseInt(month, 10) || new Date().getMonth() + 1;
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await Expense.find({
      circle: { $in: circleIds },
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    });

    const weeks = {};
    for (const expense of expenses) {
      const date = new Date(expense.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      weeks[key] = roundTo(weeks[key] + expense.amount);
    }

    return Object.entries(weeks)
      .map(([week, amount]) => ({ week, amount }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  async getDailySpending(userId, startDate, endDate, circleId) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const expenses = await Expense.find({
      circle: { $in: circleIds },
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('circle', 'name currency');

    const daily = {};
    for (const expense of expenses) {
      const key = new Date(expense.date).toISOString().split('T')[0];
      if (!daily[key]) daily[key] = { date: key, amount: 0, count: 0 };
      daily[key].amount = roundTo(daily[key].amount + expense.amount);
      daily[key].count += 1;
    }

    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCategoryDistribution(userId, circleId, startDate, endDate) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const filter = {
      circle: { $in: circleIds },
      isDeleted: false,
    };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(filter).populate('category', 'name icon color');

    const categoryMap = {};
    let totalAmount = 0;
    for (const expense of expenses) {
      const cat = expense.category?.name || 'Uncategorized';
      const catColor = expense.category?.color || '#6366f1';
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, color: catColor, amount: 0, count: 0 };
      categoryMap[cat].amount = roundTo(categoryMap[cat].amount + expense.amount);
      categoryMap[cat].count += 1;
      totalAmount += expense.amount;
    }

    const distribution = Object.values(categoryMap).map((cat) => ({
      ...cat,
      percentage: totalAmount > 0 ? roundTo((cat.amount / totalAmount) * 100) : 0,
    }));

    return { distribution, totalAmount };
  }

  async getMemberBalances(circleId) {
    const summary = await financialEngine.getCircleSummary(circleId);
    return summary.memberBalances.map(b => ({
      userId: b.userId,
      name: b.name,
      totalPaid: roundTo(b.totalPaid),
      totalOwed: roundTo(b.totalOwed),
      netBalance: roundTo(b.netBalance),
    }));
  }

  async getCircleComparison(userId, circleIds) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    const validCircleIds = memberships.map((m) => m.circle);
    const targetIds = circleIds ? circleIds.filter(id => validCircleIds.includes(id)) : validCircleIds;

    const circles = await Circle.find({ _id: { $in: targetIds }, isDeleted: false }).select('name currency totalExpenses totalAmount');

    return circles.map((c) => ({
      circleId: c._id,
      name: c.name,
      currency: c.currency,
      totalExpenses: c.totalExpenses,
      totalAmount: c.totalAmount,
    }));
  }

  async getTopExpenses(userId, circleId, limit = 10) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const expenses = await Expense.find({
      circle: { $in: circleIds },
      isDeleted: false,
    })
      .sort({ amount: -1 })
      .limit(limit)
      .populate('paidBy', 'name email')
      .populate('circle', 'name currency')
      .populate('category', 'name icon color');

    return expenses.map((e) => ({
      _id: e._id,
      title: e.title,
      amount: e.amount,
      date: e.date,
      paidBy: e.paidBy,
      circle: e.circle,
      category: e.category,
    }));
  }

  async getTopPayers(userId, circleId, limit = 10) {
    let summary;
    if (circleId) {
      summary = await financialEngine.getCircleSummary(circleId);
    } else {
      // Aggregate across all user's circles
      const { Member } = require('../models');
      const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
      const circleIds = memberships.map(m => m.circle);
      if (circleIds.length === 0) return [];
      
      // Get summary for each circle and merge
      const summaries = await Promise.all(circleIds.map(id => financialEngine.getCircleSummary(id.toString())));
      summary = { memberBalances: [] };
      summaries.forEach(s => summary.memberBalances.push(...s.memberBalances));
    }
    return summary.memberBalances
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, limit)
      .map(b => ({
        userId: b.userId,
        name: b.name,
        totalPaid: roundTo(b.totalPaid),
      }));
  }

  async getTopReceivers(userId, circleId, limit = 10) {
    let summary;
    if (circleId) {
      summary = await financialEngine.getCircleSummary(circleId);
    } else {
      // Aggregate across all user's circles
      const { Member } = require('../models');
      const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle');
      const circleIds = memberships.map(m => m.circle);
      if (circleIds.length === 0) return [];
      
      // Get summary for each circle and merge
      const summaries = await Promise.all(circleIds.map(id => financialEngine.getCircleSummary(id.toString())));
      summary = { memberBalances: [] };
      summaries.forEach(s => summary.memberBalances.push(...s.memberBalances));
    }
    return summary.memberBalances
      .sort((a, b) => b.totalOwed - a.totalOwed)
      .slice(0, limit)
      .map(b => ({
        userId: b.userId,
        name: b.name,
        totalOwed: roundTo(b.totalOwed),
      }));
  }

  async getSettlementStatistics(circleId) {
    const total = await Settlement.countDocuments({ circle: circleId, isDeleted: false });
    const pending = await Settlement.countDocuments({ circle: circleId, status: 'pending', isDeleted: false });
    const completed = await Settlement.countDocuments({ circle: circleId, status: 'completed', isDeleted: false });
    const cancelled = await Settlement.countDocuments({ circle: circleId, status: 'cancelled', isDeleted: false });

    const totalAmount = await Settlement.aggregate([
      { $match: { circle: new (require('mongoose').Schema.Types.ObjectId)(circleId), isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      total,
      pending,
      completed,
      cancelled,
      totalAmount: totalAmount[0]?.total || 0,
    };
  }

  async getCashFlow(userId, startDate, endDate, circleId) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    let circleIds = memberships.map((m) => m.circle);
    if (circleId) circleIds = circleIds.filter(id => id.toString() === circleId);

    const filter = {
      circle: { $in: circleIds },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('from', 'name email')
      .populate('to', 'name email');

    const inflow = roundTo(transactions.filter(t => t.to).reduce((sum, t) => sum + t.amount, 0));
    const outflow = roundTo(transactions.filter(t => t.from).reduce((sum, t) => sum + t.amount, 0));

    return {
      inflow,
      outflow,
      netCashFlow: roundTo(inflow - outflow),
      transactions: transactions.slice(0, 100),
    };
  }

  async getDashboardSummary(userId) {
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    const circleIds = memberships.map((m) => m.circle);

    const [totalCircles, totalExpenses, totalSettlements] = await Promise.all([
      Member.countDocuments({ user: userId, isActive: true }),
      Expense.countDocuments({ circle: { $in: circleIds }, isDeleted: false }),
      Settlement.countDocuments({ circle: { $in: circleIds }, isDeleted: false }),
    ]);

    const expensesAmount = await Expense.aggregate([
      { $match: { circle: { $in: circleIds }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const recentActivity = await ActivityLog.find({ circle: { $in: circleIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email avatar');

    const pendingSettlements = await Settlement.find({
      circle: { $in: circleIds },
      status: 'pending',
      isDeleted: false,
    }).populate('from', 'name email').populate('to', 'name email');

    return {
      totalCircles,
      totalExpenses,
      totalSettlements,
      totalSpent: expensesAmount[0]?.total || 0,
      recentActivity,
      pendingSettlements,
    };
  }
}

module.exports = new AnalyticsService();
