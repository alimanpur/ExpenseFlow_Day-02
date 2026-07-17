/**
 * ExpenseFlow - Reports Service
 * Generates reports and exports in multiple formats.
 */
const { Expense, Settlement } = require('../models');
const { roundTo } = require('../utils/helpers');

class ReportsService {
  async getMonthlyReport(userId, year, month, circleId) {
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
    }).populate('paidBy', 'name email').populate('category', 'name').populate('circle', 'name currency');

    const settlements = await Settlement.find({
      circle: { $in: circleIds },
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('from', 'name email').populate('to', 'name email');

    const totalSpent = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const totalSettled = roundTo(settlements.reduce((sum, s) => sum + s.amount, 0));

    return {
      type: 'monthly',
      period: { year, month },
      filters: { circleId },
      summary: {
        totalExpenses: expenses.length,
        totalSettlements: settlements.length,
        totalSpent,
        totalSettled,
        netBalance: roundTo(totalSpent - totalSettled),
      },
      expenses: expenses.map((e) => ({
        _id: e._id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        paidBy: e.paidBy,
        circle: e.circle,
        category: e.category,
      })),
      settlements: settlements.map((s) => ({
        _id: s._id,
        amount: s.amount,
        status: s.status,
        from: s.from,
        to: s.to,
        createdAt: s.createdAt,
      })),
    };
  }

  async getCircleReport(userId, circleId) {
    const circle = await require('../models').Circle.findById(circleId);
    if (!circle) throw new Error('Circle not found');

    const expenses = await Expense.find({ circle: circleId, isDeleted: false })
      .populate('paidBy', 'name email')
      .populate('category', 'name');

    const settlements = await Settlement.find({ circle: circleId, isDeleted: false })
      .populate('from', 'name email')
      .populate('to', 'name email');

    const totalSpent = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const totalSettled = roundTo(settlements.reduce((sum, s) => sum + s.amount, 0));

    return {
      type: 'circle',
      circle: { _id: circle._id, name: circle.name, currency: circle.currency },
      summary: {
        totalExpenses: expenses.length,
        totalSettlements: settlements.length,
        totalSpent,
        totalSettled,
        netBalance: roundTo(totalSpent - totalSettled),
      },
      expenses: expenses.map((e) => ({
        _id: e._id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        paidBy: e.paidBy,
        category: e.category,
      })),
      settlements: settlements.map((s) => ({
        _id: s._id,
        amount: s.amount,
        status: s.status,
        from: s.from,
        to: s.to,
        createdAt: s.createdAt,
      })),
    };
  }

  async getMemberReport(userId, memberId, circleId, startDate, endDate) {
    const expenses = await Expense.find({
      circle: circleId,
      paidBy: memberId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('paidBy', 'name email').populate('category', 'name');

    const settlementsFrom = await Settlement.find({
      circle: circleId,
      from: memberId,
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('from', 'name email').populate('to', 'name email');

    const settlementsTo = await Settlement.find({
      circle: circleId,
      to: memberId,
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('from', 'name email').populate('to', 'name email');

    const totalSpent = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const totalPaidOut = roundTo(settlementsFrom.reduce((sum, s) => sum + s.amount, 0));
    const totalReceived = roundTo(settlementsTo.reduce((sum, s) => sum + s.amount, 0));

    return {
      type: 'member',
      memberId,
      period: { startDate, endDate },
      summary: {
        totalExpenses: expenses.length,
        totalSettlements: settlementsFrom.length + settlementsTo.length,
        totalSpent,
        totalPaidOut,
        totalReceived,
      },
      expenses: expenses.map((e) => ({
        _id: e._id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        category: e.category,
      })),
      settlementsFrom: settlementsFrom.map((s) => ({
        _id: s._id,
        amount: s.amount,
        status: s.status,
        to: s.to,
        createdAt: s.createdAt,
      })),
      settlementsTo: settlementsTo.map((s) => ({
        _id: s._id,
        amount: s.amount,
        status: s.status,
        from: s.from,
        createdAt: s.createdAt,
      })),
    };
  }

  async getSettlementReport(userId, circleId, startDate, endDate) {
    const settlements = await Settlement.find({
      circle: circleId,
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('from', 'name email').populate('to', 'name email');

    const totalAmount = roundTo(settlements.reduce((sum, s) => sum + s.amount, 0));
    const completed = settlements.filter((s) => s.status === 'completed');
    const pending = settlements.filter((s) => s.status === 'pending');
    const cancelled = settlements.filter((s) => s.status === 'cancelled');

    return {
      type: 'settlement',
      circleId,
      period: { startDate, endDate },
      summary: {
        totalSettlements: settlements.length,
        totalAmount,
        completed: completed.length,
        pending: pending.length,
        cancelled: cancelled.length,
      },
      settlements: settlements.map((s) => ({
        _id: s._id,
        amount: s.amount,
        status: s.status,
        from: s.from,
        to: s.to,
        createdAt: s.createdAt,
      })),
    };
  }

  async getExpenseReport(userId, circleId, startDate, endDate) {
    const expenses = await Expense.find({
      circle: circleId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).populate('paidBy', 'name email').populate('category', 'name icon color');

    const totalAmount = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const categoryMap = {};

    for (const expense of expenses) {
      const cat = expense.category?.name || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, total: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].total = roundTo(categoryMap[cat].total + expense.amount);
    }

    return {
      type: 'expense',
      circleId,
      period: { startDate, endDate },
      summary: {
        totalExpenses: expenses.length,
        totalAmount,
        categories: Object.keys(categoryMap).length,
      },
      categoryBreakdown: categoryMap,
      expenses: expenses.map((e) => ({
        _id: e._id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        paidBy: e.paidBy,
        category: e.category,
      })),
    };
  }

  exportAsCSV(report, filename) {
    const rows = [];
    if (report.expenses) {
      rows.push(['Title', 'Amount', 'Date', 'Paid By', 'Category']);
      for (const e of report.expenses) {
        rows.push([e.title, e.amount, e.date, e.paidBy?.name || '', e.category?.name || '']);
      }
    }
    if (report.settlements) {
      rows.push(['From', 'To', 'Amount', 'Status', 'Date']);
      for (const s of report.settlements) {
        rows.push([s.from?.name || '', s.to?.name || '', s.amount, s.status, s.createdAt]);
      }
    }

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    return {
      filename: `${filename}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    };
  }

  exportAsJSON(report, filename) {
    return {
      filename: `${filename}.json`,
      content: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    };
  }

  exportReport(report, format) {
    const filename = `report-${Date.now()}`;
    switch (format) {
      case 'csv': return this.exportAsCSV(report, filename);
      case 'json': return this.exportAsJSON(report, filename);
      default:
        return {
          filename: `${filename}.${format}`,
          content: JSON.stringify(report, null, 2),
          contentType: 'application/octet-stream',
        };
    }
  }
}

module.exports = new ReportsService();
