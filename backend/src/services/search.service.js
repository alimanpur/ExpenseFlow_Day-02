/**
 * ExpenseFlow - Search Service
 * Global search across expenses, members, groups, and transactions.
 */
const { Expense, Circle, Settlement } = require('../models');

class SearchService {
  async globalSearch(userId, query) {
    const { q, type, limit = 20, page = 1, sortBy = 'relevance', sortOrder = 'desc' } = query;
    if (!q || q.trim().length < 2) {
      return { results: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');
    const { Member } = require('../models');
    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    const circleIds = memberships.map((m) => m.circle);

    const searchTypes = type ? [type] : ['expenses', 'circles', 'members', 'settlements'];
    const results = [];
    const searchPromises = [];

    if (searchTypes.includes('expenses')) {
      searchPromises.push(
        Expense.find({
          circle: { $in: circleIds },
          isDeleted: false,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { notes: searchRegex },
          ],
        })
          .select('title amount date circle paidBy')
          .populate('circle', 'name')
          .populate('paidBy', 'name email')
          .lean()
          .then((expenses) => {
            const dir = sortOrder === 'asc' ? 1 : -1;
            expenses.sort((a, b) => {
              if (sortBy === 'amount') return (a.amount - b.amount) * dir;
              if (sortBy === 'date') return (new Date(a.date) - new Date(b.date)) * dir;
              return (new Date(b.createdAt) - new Date(a.createdAt));
            });
            results.push(...expenses.slice(0, limit * 2).map((e) => ({ ...e, _type: 'expense' })));
          })
      );
    } else {
      searchPromises.push(Promise.resolve());
    }

    if (searchTypes.includes('circles')) {
      searchPromises.push(
        Circle.find({
          _id: { $in: circleIds },
          isDeleted: false,
          $or: [
            { name: searchRegex },
            { description: searchRegex },
          ],
        })
          .select('name description currency totalExpenses totalAmount')
          .lean()
          .then((circles) => {
            const dir = sortOrder === 'asc' ? 1 : -1;
            circles.sort((a, b) => {
              if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
              return (new Date(b.updatedAt) - new Date(a.updatedAt));
            });
            results.push(...circles.slice(0, limit).map((c) => ({ ...c, _type: 'circle' })));
          })
      );
    } else {
      searchPromises.push(Promise.resolve());
    }

    if (searchTypes.includes('members')) {
      searchPromises.push(
        Member.find({
          circle: { $in: circleIds },
          isActive: true,
        })
          .populate({
            path: 'user',
            match: { $or: [{ name: searchRegex }, { email: searchRegex }] },
            select: 'name email avatar',
          })
          .limit(limit)
          .then((circleMembers) => {
            const validMembers = circleMembers.filter((m) => m.user);
            results.push(...validMembers.map((m) => ({
              _type: 'member',
              user: m.user,
              circle: m.circle,
              role: m.role,
            })));
          })
      );
    } else {
      searchPromises.push(Promise.resolve());
    }

    if (searchTypes.includes('settlements')) {
      searchPromises.push(
        Settlement.find({
          circle: { $in: circleIds },
          isDeleted: false,
          $or: [
            { note: searchRegex },
            { paymentReference: searchRegex },
          ],
        })
          .select('amount status from to createdAt')
          .populate('from', 'name email')
          .populate('to', 'name email')
          .lean()
          .then((settlements) => {
            const dir = sortOrder === 'asc' ? 1 : -1;
            settlements.sort((a, b) => {
              if (sortBy === 'amount') return (a.amount - b.amount) * dir;
              return (new Date(b.createdAt) - new Date(a.createdAt));
            });
            results.push(...settlements.slice(0, limit).map((s) => ({ ...s, _type: 'settlement' })));
          })
      );
    } else {
      searchPromises.push(Promise.resolve());
    }

    await Promise.all(searchPromises);

    const total = results.length;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + parseInt(limit));

    return {
      results: paginatedResults,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      query: q.trim(),
    };
  }
}

module.exports = new SearchService();
