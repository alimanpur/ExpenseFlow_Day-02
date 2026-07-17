/**
 * ExpenseFlow - Financial Engine
 * THE single source of truth for ALL financial calculations.
 *
 * Architecture:
 *   MongoDB → Aggregation Pipeline → FinancialEngine → API → React Query → UI
 *
 * IDENTITY RESOLUTION:
 *   Canonical identity is Circle Member._id for ALL financial references.
 *   User._id (from JWT) is resolved to Member._id at service entry points.
 *   FinancialEngine operates exclusively with Member._id as canonical keys.
 *
 *   For backward compatibility with existing data that may contain User._id
 *   in Expense.paidBy, ExpenseSplit.user, Settlement.from/to, or
 *   Transaction.from/to, the engine maintains a dual-ID mapping that
 *   translates both User._id and Member._id to the canonical Member._id.
 *
 * Every financial value in the system MUST flow through this engine.
 * Nothing is stored. Everything is computed on-demand via aggregation.
 */
const mongoose = require('mongoose');
const { Expense, ExpenseSplit, Settlement, Member, Circle, Transaction, ActivityLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { roundTo } = require('../utils/helpers');
const { SETTLEMENT_STATUS } = require('../constants');

class FinancialEngine {
  // ─── Helpers ────────────────────────────────────────────────────

  _toId(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    return val._id ? val._id.toString() : val.toString();
  }

  /**
   * Canonical member key: ALWAYS Member._id.
   * This replaces the previous logic that returned User._id for registered members.
   */
  _memberKey(member) {
    return member._id.toString();
  }

  /**
   * Canonical member user ID: ALWAYS Member._id.
   * This replaces the previous logic that returned User._id for registered members.
   */
  _resolveMemberUserId(member) {
    return member._id.toString();
  }

  /**
   * Resolve a stable display name for a member, regardless of whether they are
   * a registered user or a name-only guest. Falls back through:
   *   user.name → user.email → member.displayName → member.nickname → "Guest"
   * Used everywhere a settlement/member name is surfaced so the UI never shows
   * an empty or "A user" placeholder when a real name is available.
   */
  resolveMemberName(member) {
    if (!member) return 'Guest';
    const user = member.user && typeof member.user === 'object' ? member.user : null;
    return (
      user?.name ||
      user?.email ||
      member.displayName ||
      member.nickname ||
      (user && user._id ? `User ${String(user._id).slice(-4)}` : null) ||
      'Guest'
    );
  }


  // ─── Circle Summary ─────────────────────────────────────────────
  // GET /api/circles/:circleId/financial-summary

  async getCircleSummary(circleId, _requestingUserId) {
    const circleObjectId = new mongoose.Types.ObjectId(circleId);
    const circle = await Circle.findById(circleObjectId);
    if (!circle) throw ApiError.notFound('Circle not found');
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject settlement operations');

    if (circle.isArchived) {
      const members = await Member.find({ circle: circleObjectId, isActive: true, isDeleted: false })
        .populate('user', 'name email avatar')
        .lean();

      const memberBalances = members.map(m => ({
        userId: this._resolveMemberUserId(m),
        name: m.user?.name || m.displayName || 'A user',
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      }));

      return {
        circleId,
        totalSpent: 0,
        expenseCount: 0,
        memberCount: members.length,
        memberBalances,
        debtMatrix: { matrix: {}, relationships: [] },
        settlementSuggestions: [],
        pendingSettlements: [],
        completedSettlements: [],
        cancelledSettlements: [],
        categoryTotals: [],
        monthlyTrend: [],
        largestExpense: null,
        topCategory: null,
        biggestSpender: null,
        totalOutstanding: 0,
      };
    }

    const members = await Member.find({ circle: circleObjectId, isActive: true, isDeleted: false })
      .populate('user', 'name email avatar')
      .lean();

    if (!members || members.length === 0) {
      throw ApiError.badRequest('Circle has no active members');
    }

    // Canonical keys are ALL Member._id
    const memberUserIds = members.map(m => this._resolveMemberUserId(m));
    const memberNameMap = {};
    members.forEach(m => {
      const uid = this._resolveMemberUserId(m);
      memberNameMap[uid] = this.resolveMemberName(m);
    });

    const expenses = await Expense.find({ circle: circleObjectId, isDeleted: false }).lean();
    const expenseIds = expenses.map(e => e._id.toString());

    const splits = expenseIds.length > 0
      ? await ExpenseSplit.find({ expense: { $in: expenseIds }, isDeleted: false }).lean()
      : [];

    const settlements = await Settlement.find({ circle: circleObjectId, isDeleted: false }).lean();

    // ── 1. Member balances ──
    const balanceMap = {};
    // Dual-ID mapping: translate any stored ID (User._id or Member._id) → canonical Member._id
    const idToBalanceKey = {};
    members.forEach(m => {
      const uid = this._resolveMemberUserId(m);
      balanceMap[uid] = { totalPaid: 0, totalOwed: 0, netBalance: 0 };
      // Map User._id → canonical Member._id (for registered members)
      if (m.user) {
        const userId = m.user._id ? m.user._id.toString() : m.user.toString();
        idToBalanceKey[userId] = uid;
      }
      // Map Member._id → canonical Member._id (always)
      idToBalanceKey[m._id.toString()] = uid;
    });

    // Resolve a settlement from/to id (which may be a User._id, this circle's
    // Member._id, or even a Member._id from ANOTHER circle) to the canonical
    // Member._id of THIS circle. Cross-circle Member._id references happen when
    // identity resolution produced the wrong member document; we recover by
    // matching on the underlying user so balances stay correct and zero-sum holds.
    const userToBalanceKey = {};
    members.forEach(m => {
      if (m.user) {
        const userId = m.user._id ? m.user._id.toString() : m.user.toString();
        userToBalanceKey[userId] = this._resolveMemberUserId(m);
      }
    });
    const resolveSettlementParty = async (partyId) => {
      if (!partyId) return null;
      const id = partyId.toString();
      if (idToBalanceKey[id]) return idToBalanceKey[id];
      const doc = await Member.findById(id).select('user').lean();
      if (!doc) return null;
      if (doc.user) {
        const userId = doc.user._id ? doc.user._id.toString() : doc.user.toString();
        if (userToBalanceKey[userId]) return userToBalanceKey[userId];
      }
      return null;
    };
    const settlementPartyCache = {};
    const resolveParty = async (partyId) => {
      const id = partyId.toString();
      if (!(id in settlementPartyCache)) settlementPartyCache[id] = await resolveSettlementParty(id);
      return settlementPartyCache[id];
    };

    expenses.forEach(e => {
      const payerId = e.paidBy.toString();
      const balanceKey = idToBalanceKey[payerId];
      if (balanceKey && balanceMap[balanceKey]) {
        balanceMap[balanceKey].totalPaid = roundTo(balanceMap[balanceKey].totalPaid + e.amount);
      }
    });

    splits.forEach(s => {
      const userId = s.user.toString();
      const balanceKey = idToBalanceKey[userId];
      if (balanceKey && balanceMap[balanceKey]) {
        balanceMap[balanceKey].totalOwed = roundTo(balanceMap[balanceKey].totalOwed + s.amount);
      }
    });

    const memberSettlementStats = {};
    memberUserIds.forEach(uid => {
      memberSettlementStats[uid] = { settlementsSent: 0, settlementsReceived: 0 };
    });

    await Promise.all(settlements.map(async (s) => {
      if (s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED) {
        const fromKey = await resolveParty(s.from);
        const toKey = await resolveParty(s.to);
        if (fromKey && memberSettlementStats[fromKey]) {
          memberSettlementStats[fromKey].settlementsSent = roundTo(memberSettlementStats[fromKey].settlementsSent + s.amount);
        }
        if (toKey && memberSettlementStats[toKey]) {
          memberSettlementStats[toKey].settlementsReceived = roundTo(memberSettlementStats[toKey].settlementsReceived + s.amount);
        }
      }
    }));

    const memberBalances = memberUserIds.map(uid => {
      const b = balanceMap[uid];
      const ss = memberSettlementStats[uid] || { settlementsSent: 0, settlementsReceived: 0 };
      if (!b) return null;
      const expenseNet = roundTo(b.totalPaid - b.totalOwed);
      const adjustedNet = roundTo(expenseNet - ss.settlementsReceived + ss.settlementsSent);
      // Persist the computed net back into balanceMap so downstream consumers
      // (debt matrix, settlement suggestions) use the real value, not the
      // initialised 0. Previously this was left as 0, which made every
      // settlement suggestion collapse to an empty set.
      b.netBalance = adjustedNet;
      return {
        userId: uid,
        name: memberNameMap[uid],
        totalPaid: b.totalPaid,
        totalOwed: b.totalOwed,
        settlementsSent: ss.settlementsSent,
        settlementsReceived: ss.settlementsReceived,
        netBalance: adjustedNet,
      };
    }).filter(Boolean);

    // ── 2. Debt matrix ──
    const debtMatrix = await this._buildDebtMatrix(members, memberNameMap, expenses, splits, settlements);

    // ── 3. Settlement suggestions (Minimum Transfer Algorithm) ──
    const netBalancesForSettlement = memberUserIds.map(uid => ({
      userId: uid,
      name: memberNameMap[uid],
      netBalance: balanceMap[uid].netBalance,
    }));
    const settlementSuggestions = this._minimumTransferAlgorithm(netBalancesForSettlement);

    // ── 4. Settlements by status ──
    // Attach resolved fromName/toName so the UI never shows "A user".
    // Prefer this circle's memberNameMap; fall back to a direct Member lookup
    // for references (e.g. cross-circle or legacy) that aren't in this circle.
    const settlementNameCache = {};
    const resolveSettlementName = async (partyId) => {
      const id = typeof partyId === 'string' ? partyId : (partyId?._id || partyId?.id || partyId)?.toString?.();
      if (!id) return 'Guest';
      if (memberNameMap[id]) return memberNameMap[id];
      if (settlementNameCache[id]) return settlementNameCache[id];
      const member = await Member.findById(id).select('displayName nickname user').populate('user', 'name email').lean();
      const name = this.resolveMemberName(member);
      settlementNameCache[id] = name;
      return name;
    };
    const withNames = async (s) => ({
      ...s,
      fromName: await resolveSettlementName(s.from),
      toName: await resolveSettlementName(s.to),
    });
    const pendingSettlements = (await Promise.all(settlements.filter(s => s.status === SETTLEMENT_STATUS.PENDING).map(withNames)));
    const completedSettlements = (await Promise.all(settlements.filter(s => s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED).map(withNames)));
    const cancelledSettlements = (await Promise.all(settlements.filter(s => s.status === SETTLEMENT_STATUS.CANCELLED || s.status === SETTLEMENT_STATUS.EXPIRED).map(withNames)));

    // ── 5. Category totals ──
    const categoryTotals = {};
    expenses.forEach(e => {
      const cat = e.category?.toString() || 'uncategorized';
      categoryTotals[cat] = roundTo((categoryTotals[cat] || 0) + e.amount);
    });
    const categoryTotalsArray = Object.entries(categoryTotals).map(([category, amount]) => ({ category, amount }));

    // ── 6. Monthly trend ──
    const monthlyMap = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const key = new Date(e.date).toISOString().slice(0, 7);
      monthlyMap[key] = roundTo((monthlyMap[key] || 0) + e.amount);
    });
    const monthlyTrend = Object.entries(monthlyMap)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── 7. Largest expense ──
    const largestExpense = expenses.length > 0
      ? expenses.reduce((max, e) => (e.amount || 0) > (max.amount || 0) ? e : max, expenses[0])
      : null;

    // ── 8. Top category ──
    const topCategoryEntry = categoryTotalsArray.length > 0
      ? categoryTotalsArray.reduce((max, c) => (c.amount || 0) > (max.amount || 0) ? c : max, categoryTotalsArray[0])
      : null;

    // ── 9. Biggest spender ──
    const payerTotals = {};
    expenses.forEach(e => {
      const payerId = e.paidBy?.toString();
      if (!payerId) return;
      const name = memberNameMap[idToBalanceKey[payerId]] || memberNameMap[payerId] || 'A user';
      payerTotals[name] = roundTo((payerTotals[name] || 0) + e.amount);
    });
    const biggestSpenderEntry = Object.entries(payerTotals).length > 0
      ? Object.entries(payerTotals).reduce((max, c) => (c[1] || 0) > (max[1] || 0) ? c : max, Object.entries(payerTotals)[0])
      : null;

    // ── 10. Total outstanding ──
    const totalOutstanding = roundTo(settlementSuggestions.reduce((sum, s) => sum + s.amount, 0));

    // ── 11. Zero-sum invariant validation ──
    const sumNetBalances = roundTo(memberBalances.reduce((sum, b) => sum + b.netBalance, 0));
    if (Math.abs(sumNetBalances) > 0.02) {
      const error = new Error(`[FinancialEngine] Balance invariant violation for circle ${circleId}: Σ netBalance = ${sumNetBalances}, tolerance: ±0.02`);
      if (process.env.NODE_ENV === 'development' || process.env.EXPENSEFLOW_STRICT_ASSERTIONS === 'true') {
        throw error;
      }
      console.error(error.message);
    }

    return {
      circleId,
      totalSpent: roundTo(expenses.reduce((sum, e) => sum + e.amount, 0)),
      expenseCount: expenses.length,
      memberCount: members.length,
      memberBalances,
      debtMatrix,
      settlementSuggestions,
      pendingSettlements,
      completedSettlements,
      cancelledSettlements,
      categoryTotals: categoryTotalsArray,
      monthlyTrend,
      largestExpense,
      topCategory: topCategoryEntry ? { category: topCategoryEntry.category, amount: topCategoryEntry.amount } : null,
      biggestSpender: biggestSpenderEntry ? { name: biggestSpenderEntry[0], amount: biggestSpenderEntry[1] } : null,
      totalOutstanding,
    };
  }

  async _buildDebtMatrix(members, memberNameMap, expenses, splits, settlements) {
    const idToBalanceKey = {};
    const userToBalanceKey = {};
    members.forEach(m => {
      const key = this._resolveMemberUserId(m);
      if (m.user) {
        const userId = m.user._id ? m.user._id.toString() : m.user.toString();
        idToBalanceKey[userId] = key;
        userToBalanceKey[userId] = key;
      }
      idToBalanceKey[m._id.toString()] = key;
    });

    const memberUserIds = members.map(m => this._resolveMemberUserId(m));
    const balanceKeys = [...new Set(memberUserIds)];
    const matrix = {};
    balanceKeys.forEach(fromId => {
      matrix[fromId] = {};
      balanceKeys.forEach(toId => {
        if (fromId !== toId) matrix[fromId][toId] = 0;
      });
    });

    expenses.forEach(e => {
      const payerId = e.paidBy.toString();
      const balancePayerId = idToBalanceKey[payerId];
      if (!balancePayerId || !matrix[balancePayerId]) return;
      splits.filter(s => s.expense?.toString() === e._id.toString() || s.expense === e._id).forEach(s => {
        const participantId = s.user.toString();
        const balanceParticipantId = idToBalanceKey[participantId];
        if (balanceParticipantId && balanceParticipantId !== balancePayerId && matrix[balanceParticipantId] && matrix[balanceParticipantId][balancePayerId] !== undefined) {
          matrix[balanceParticipantId][balancePayerId] = roundTo(matrix[balanceParticipantId][balancePayerId] + s.amount);
        }
      });
    });

    const partyCache = {};
    const resolveParty = async (partyId) => {
      const id = partyId.toString();
      if (!(id in partyCache)) {
        let key = idToBalanceKey[id] || null;
        if (!key) {
          const doc = await Member.findById(id).select('user').lean();
          if (doc && doc.user) {
            const userId = doc.user._id ? doc.user._id.toString() : doc.user.toString();
            key = userToBalanceKey[userId] || null;
          }
        }
        partyCache[id] = key;
      }
      return partyCache[id];
    };

    await Promise.all(settlements.map(async (s) => {
      if (s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED) {
        const fromId = await resolveParty(s.from);
        const toId = await resolveParty(s.to);
        if (fromId && toId && matrix[fromId] && matrix[fromId][toId] !== undefined) {
          matrix[fromId][toId] = Math.max(0, roundTo(matrix[fromId][toId] - s.amount));
        }
      }
    }));

    const relationships = [];
    balanceKeys.forEach(fromId => {
      balanceKeys.forEach(toId => {
        if (fromId !== toId && matrix[fromId][toId] > 0.005) {
          relationships.push({
            fromId,
            toId,
            fromName: memberNameMap[fromId],
            toName: memberNameMap[toId],
            amount: matrix[fromId][toId],
          });
        }
      });
    });

    return { matrix, relationships };
  }

  _minimumTransferAlgorithm(netBalances) {
    const creditors = netBalances
      .filter(n => n.netBalance > 0.01)
      .sort((a, b) => b.netBalance - a.netBalance)
      .map(c => ({ ...c, remaining: c.netBalance }));

    const debtors = netBalances
      .filter(n => n.netBalance < -0.01)
      .sort((a, b) => a.netBalance - b.netBalance)
      .map(d => ({ ...d, remaining: Math.abs(d.netBalance) }));

    const settlements = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const settleAmount = roundTo(Math.min(creditors[i].remaining, debtors[j].remaining));
      if (settleAmount > 0.01) {
        settlements.push({
          fromId: debtors[j].userId,
          toId: creditors[i].userId,
          fromName: debtors[j].name,
          toName: creditors[i].name,
          amount: settleAmount,
        });
      }
      creditors[i].remaining = roundTo(creditors[i].remaining - settleAmount);
      debtors[j].remaining = roundTo(debtors[j].remaining - settleAmount);
      if (creditors[i].remaining <= 0.01) i++;
      if (debtors[j].remaining <= 0.01) j++;
    }
    return settlements;
  }

  // ─── Dashboard ─────────────────────────────────────────────────
  // GET /api/users/me/dashboard

  async getDashboard(userId) {
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false })
      .populate('circle', 'name currency isArchived')
      .lean();
    const activeMemberships = memberships.filter(m => !m.circle?.isArchived);
    const circleIds = activeMemberships.map(m => m.circle._id.toString());

    let totalPaid = 0;
    let totalOwedToYou = 0;
    let totalYouOwe = 0;
    let netBalance = 0;

    for (const membership of activeMemberships) {
      const circleId = membership.circle._id.toString();
      const memberId = membership._id.toString();
      try {
        const summary = await this.getCircleSummary(circleId, userId);
        const myBalance = summary.memberBalances.find(b => b.userId === memberId);
        if (myBalance) {
          const paid = roundTo(myBalance.totalPaid);
          const net = roundTo(myBalance.netBalance);
          totalPaid = roundTo(totalPaid + paid);
          if (net >= 0) totalOwedToYou = roundTo(totalOwedToYou + net);
          else totalYouOwe = roundTo(totalYouOwe + Math.abs(net));
          netBalance = roundTo(netBalance + net);
        }
      } catch (err) {
        console.warn(`[FinancialEngine] Skipping circle ${circleId} in dashboard: ${err.message}`);
      }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlySpendingAgg = await Expense.aggregate([
      {
        $match: {
          circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
          isDeleted: false,
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthlySpending = roundTo(monthlySpendingAgg[0]?.total || 0);

    const [totalCirclesCount, totalExpensesCount, pendingSettlementsCount, completedSettlementsCount, openExpensesCount] =
      await Promise.all([
        Circle.countDocuments({ _id: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) }, isDeleted: false }),
        Expense.countDocuments({ circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) }, isDeleted: false }),
        Settlement.countDocuments({ circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) }, status: SETTLEMENT_STATUS.PENDING, isDeleted: false }),
        Settlement.countDocuments({
          circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: { $in: [SETTLEMENT_STATUS.COMPLETED, SETTLEMENT_STATUS.CONFIRMED] },
          isDeleted: false,
        }),
        Expense.countDocuments({ circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) }, isDeleted: false, status: { $ne: 'settled' } }),
      ]);

    const recentActivity = await ActivityLog.find({ circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email avatar')
      .lean();

    const circleSummaries = await Promise.all(
      activeMemberships.map(async (membership) => {
        const cid = membership.circle._id.toString();
        const memberId = membership._id.toString();
        try {
          const summary = await this.getCircleSummary(cid, userId);
          return {
            id: cid,
            name: membership.circle.name,
            currency: membership.circle.currency,
            totalSpent: summary.totalSpent,
            netBalance: summary.memberBalances.reduce((s, b) => s + b.netBalance, 0),
            yourBalance: summary.memberBalances.find(b => b.userId === memberId)?.netBalance || 0,
          };
        } catch (err) {
          console.warn(`[FinancialEngine] Skipping circle ${cid} in dashboard summary: ${err.message}`);
          return null;
        }
      })
    );

    const outstandingPromises = circleIds.map(async (cid) => {
      try {
        const summary = await this.getCircleSummary(cid, userId);
        return summary.totalOutstanding;
      } catch (err) {
        console.warn(`[FinancialEngine] Skipping circle ${cid} in dashboard outstanding: ${err.message}`);
        return 0;
      }
    });
    const outstandingResults = await Promise.all(outstandingPromises);
    const totalOutstandingDebt = roundTo(outstandingResults.reduce((sum, val) => sum + val, 0));

    return {
      netBalance,
      totalPaid,
      totalOwedToYou,
      totalYouOwe,
      monthlySpending,
      pendingSettlements: pendingSettlementsCount,
      completedSettlements: completedSettlementsCount,
      openExpenses: openExpensesCount,
      totalCircles: totalCirclesCount,
      totalExpenses: totalExpensesCount,
      recentActivity,
      circles: circleSummaries.filter(Boolean),
      totalOutstandingDebt,
    };
  }

  // ─── People Summary ────────────────────────────────────────────
  // GET /api/users/me/people-summary

  async getPeopleSummary(userId) {
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false })
      .select('circle role')
      .populate('circle', 'name currency isArchived')
      .lean();
    const activeMemberships = memberships.filter(m => !m.circle?.isArchived);
    const circleIds = activeMemberships.map(m => m.circle._id.toString());

    if (circleIds.length === 0) {
      return [];
    }

    const circleMembers = await Member.find({
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true,
      isDeleted: false,
    })
      .populate('user', 'name email avatar')
      .populate('circle', 'name currency isArchived')
      .lean();

    const { Invitation } = require('../models');
    const pendingInvites = await Invitation.find({
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .populate('circle', 'name')
      .populate('invitedBy', 'name')
      .lean();

    const peopleMap = new Map();

    const keyFor = (m) => (m.user ? m.user._id.toString() : `guest:${m.displayName || m._id.toString()}`);

    for (const m of circleMembers) {
      if (m.circle?.isArchived) continue;
      const key = keyFor(m);
      const isGuest = !m.user;
      const name = m.user?.name || m.displayName || 'A user';
      const base = peopleMap.get(key) || {
        id: m.user?._id || m._id,
        key,
        name,
        email: m.user?.email || '',
        avatar: m.user?.avatar || null,
        isGuest,
        status: isGuest ? 'guest' : (m.status || 'registered'),
        ownerOf: 0,
        memberCount: 0,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
        circleCount: 0,
        circles: [],
        lastActivity: m.joinedAt || null,
      };

      if (m.role === 'owner') base.ownerOf += 1;
      base.memberCount += 1;
      base.circleCount += 1;

      try {
        const circleSummary = await this.getCircleSummary(m.circle._id.toString(), userId);
        const memberIdKey = this._resolveMemberUserId(m);
        const memberBalance = circleSummary.memberBalances.find(b => b.userId === memberIdKey);
        if (memberBalance) {
          base.totalPaid = roundTo(base.totalPaid + memberBalance.totalPaid);
          base.totalOwed = roundTo(base.totalOwed + memberBalance.totalOwed);
          base.netBalance = roundTo(base.netBalance + memberBalance.netBalance);
        }

        base.circles.push({
          id: m.circle?._id,
          name: m.circle?.name,
          role: m.role,
          balance: memberBalance ? memberBalance.netBalance : 0,
          currency: m.circle?.currency || 'USD',
        });
      } catch (err) {
        console.warn(`[FinancialEngine] Skipping circle ${m.circle?._id} in people summary: ${err.message}`);
      }
      if (m.joinedAt && (!base.lastActivity || new Date(m.joinedAt) > new Date(base.lastActivity))) {
        base.lastActivity = m.joinedAt;
      }
      peopleMap.set(key, base);
    }

    for (const inv of pendingInvites) {
      const key = `pending:${inv.invitedEmail}`;
      if (peopleMap.has(key)) continue;
      peopleMap.set(key, {
        id: key,
        key,
        name: inv.invitedEmail,
        email: inv.invitedEmail,
        avatar: null,
        isGuest: false,
        status: 'pending_invitation',
        ownerOf: 0,
        memberCount: 0,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
        circleCount: 1,
        circles: [{ id: inv.circle?._id, name: inv.circle?.name, role: 'pending', balance: 0, currency: 'USD' }],
        lastActivity: inv.createdAt || null,
        invitedBy: inv.invitedBy?.name || null,
      });
    }

    return Array.from(peopleMap.values()).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatar: p.avatar,
      isGuest: p.isGuest,
      status: p.status,
      role: p.ownerOf > 0 ? 'owner' : 'member',
      ownerOf: p.ownerOf,
      memberCount: p.memberCount,
      paid: p.totalPaid,
      share: p.totalOwed,
      currentBalance: p.netBalance,
      amountOwed: p.netBalance < 0 ? roundTo(Math.abs(p.netBalance)) : 0,
      amountToReceive: p.netBalance > 0 ? roundTo(p.netBalance) : 0,
      circleCount: p.circleCount,
      circles: p.circles,
      lastActivity: p.lastActivity,
      invitedBy: p.invitedBy || null,
    }));
  }

  // ─── Ledger ────────────────────────────────────────────────────
  // GET /api/users/me/ledger

  async getLedger(userId, query = {}) {
    const { circleId, startDate, endDate, page = 1, limit = 20 } = query;
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle').lean();
    const circleIds = memberships.map(m => m.circle.toString());

    if (circleId) {
      const allowed = circleIds.includes(circleId);
      if (!allowed) throw ApiError.forbidden('Access denied to this circle');
    }

    const filter = { circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) }, isDeleted: false };
    if (circleId) filter.circle = new mongoose.Types.ObjectId(circleId);
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('from', 'name email avatar')
        .populate('to', 'name email avatar')
        .populate('circle', 'name currency')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    const totalInflow = roundTo(transactions.filter(t => t.to?._id?.toString() === userId || t.to === userId).reduce((sum, t) => sum + t.amount, 0));
    const totalOutflow = roundTo(transactions.filter(t => t.from?._id?.toString() === userId || t.from === userId).reduce((sum, t) => sum + t.amount, 0));

    return {
      transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      summary: { totalInflow, totalOutflow, netFlow: roundTo(totalInflow - totalOutflow) },
    };
  }

  // ─── Analytics ─────────────────────────────────────────────────
  // GET /api/analytics/summary

  async getAnalytics(userId, period = 'all') {
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle').lean();
    const circleIds = memberships.map(m => m.circle.toString());

    const now = new Date();
    let startDate = new Date(0);
    if (period === '1m') startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else if (period === '3m') startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    else if (period === '6m') startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    else if (period === '1y') startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const matchStage = {
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      date: { $gte: startDate },
    };

    const expenses = await Expense.find(matchStage).lean();
    const settlements = await Settlement.find({
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      createdAt: { $gte: startDate },
    }).lean();

    const total = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const thisMonth = roundTo(expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0));

    const average = expenses.length > 0 ? roundTo(total / expenses.length) : 0;
    const avgPerExpense = average;

    const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
    const prevMonthTotal = roundTo(expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0));
    const momChange = prevMonthTotal > 0 ? Math.round(((thisMonth - prevMonthTotal) / prevMonthTotal) * 100) : 0;

    const topExpenses = [...expenses].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 10);

    const categoryData = {};
    expenses.forEach(e => {
      const cat = e.category?.toString() || 'Uncategorized';
      if (!categoryData[cat]) categoryData[cat] = { category: cat, value: 0, count: 0 };
      categoryData[cat].value = roundTo(categoryData[cat].value + e.amount);
      categoryData[cat].count++;
    });
    const categoryBreakdown = Object.values(categoryData).sort((a, b) => b.value - a.value);
    const topCategory = categoryBreakdown.length > 0
      ? { ...categoryBreakdown[0], pct: total > 0 ? Math.round((categoryBreakdown[0].value / total) * 100) : 0 }
      : { category: 'None', value: 0, pct: 0 };

    const monthlyData = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const key = new Date(e.date).toISOString().slice(0, 7);
      if (!monthlyData[key]) monthlyData[key] = { month: key, value: 0, count: 0 };
      monthlyData[key].value = roundTo(monthlyData[key].value + e.amount);
      monthlyData[key].count++;
    });
    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    const weeklyData = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const d = new Date(e.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeklyData[key]) weeklyData[key] = { week: key, value: 0, count: 0 };
      weeklyData[key].value = roundTo(weeklyData[key].value + e.amount);
      weeklyData[key].count++;
    });
    const weeklyTrend = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));

    const yearlyData = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const key = new Date(e.date).getFullYear().toString();
      if (!yearlyData[key]) yearlyData[key] = { year: key, value: 0, count: 0 };
      yearlyData[key].value = roundTo(yearlyData[key].value + e.amount);
      yearlyData[key].count++;
    });
    const yearlyTrend = Object.values(yearlyData).sort((a, b) => a.year.localeCompare(b.year));

    const circleData = {};
    expenses.forEach(e => {
      const cid = e.circle?.toString();
      if (!cid) return;
      const circle = memberships.find(m => m.circle.toString() === cid);
      const name = circle?.circle?.name || 'A circle';
      if (!circleData[cid]) circleData[cid] = { id: cid, name, value: 0, count: 0 };
      circleData[cid].value = roundTo(circleData[cid].value + e.amount);
      circleData[cid].count++;
    });
    const circleBreakdown = Object.values(circleData).sort((a, b) => b.value - a.value);

    const memberData = {};
    expenses.forEach(e => {
      const payerId = e.paidBy?.toString();
      if (!payerId) return;
      if (!memberData[payerId]) memberData[payerId] = { id: payerId, name: e.paidBy?.name || 'A user', value: 0, count: 0 };
      memberData[payerId].value = roundTo(memberData[payerId].value + e.amount);
      memberData[payerId].count++;
    });
    const memberBreakdown = Object.values(memberData).sort((a, b) => b.value - a.value);

    const largestExpense = expenses.length > 0
      ? expenses.reduce((max, e) => (e.amount || 0) > (max.amount || 0) ? e : max, expenses[0])
      : null;

    const mostActiveCircle = circleBreakdown.length > 0 ? circleBreakdown[0] : null;
    const mostActiveMember = memberBreakdown.length > 0 ? memberBreakdown[0] : null;
    const monthsWithData = monthlyTrend.length;
    const paymentFrequency = monthsWithData > 0 ? expenses.length / monthsWithData : 0;

    const settlementTrendData = {};
    settlements.forEach(s => {
      if (!s.createdAt) return;
      const key = new Date(s.createdAt).toISOString().slice(0, 7);
      if (!settlementTrendData[key]) settlementTrendData[key] = { month: key, count: 0, value: 0 };
      settlementTrendData[key].count++;
      settlementTrendData[key].value = roundTo(settlementTrendData[key].value + s.amount);
    });
    const settlementTrend = Object.values(settlementTrendData).sort((a, b) => a.month.localeCompare(b.month));

    const debtTrend = monthlyTrend.map(m => ({
      month: m.month,
      outstanding: roundTo(m.value - (settlementTrend.find(s => s.month === m.month)?.value || 0)),
    }));

    return {
      total,
      thisMonth,
      average,
      avgPerExpense,
      momChange,
      topExpenses,
      topCategory,
      categories: categoryBreakdown,
      monthlyTrend,
      weeklyTrend,
      yearlyTrend,
      circleBreakdown,
      memberBreakdown,
      largestExpense,
      averageExpense: average,
      mostActiveCircle,
      mostActiveMember,
      paymentFrequency,
      settlementTrend,
      debtTrend,
      expenseCount: expenses.length,
      settlementCount: settlements.length,
      circleCount: circleIds.length,
    };
  }

  // ─── Profile Stats ─────────────────────────────────────────────
  // GET /api/users/me/profile-stats

  async getProfileStats(userId) {
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false }).select('circle').lean();
    const memberIds = memberships.map(m => m._id.toString());
    const circleIds = memberships.map(m => m.circle.toString());

    const circles = await Circle.find({ _id: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) } }).select('name').lean();
    const circleNameMap = {};
    circles.forEach(c => { circleNameMap[c._id.toString()] = c.name; });

    const expenses = await Expense.find({
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      paidBy: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
    }).lean();

    const settlements = await Settlement.find({
      circle: { $in: circleIds.map(id => new mongoose.Types.ObjectId(id)) },
      $or: [{ from: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) } }, { to: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) } }],
      isDeleted: false,
    }).lean();

    const lifetimePaid = roundTo(expenses.reduce((sum, e) => sum + e.amount, 0));
    const lifetimeReceived = roundTo(settlements.filter(s => memberIds.includes(s.to.toString()) && (s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED)).reduce((sum, s) => sum + s.amount, 0));
    const lifetimeGiven = roundTo(settlements.filter(s => memberIds.includes(s.from.toString()) && (s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED)).reduce((sum, s) => sum + s.amount, 0));
    const expenseCount = expenses.length;
    const averageExpense = expenseCount > 0 ? roundTo(lifetimePaid / expenseCount) : 0;
    const largestExpense = expenses.length > 0
      ? expenses.reduce((max, e) => (e.amount || 0) > (max.amount || 0) ? e : max, expenses[0])
      : null;

    const now = new Date();
    const expensesThisMonth = expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthSpent = roundTo(expensesThisMonth.reduce((sum, e) => sum + e.amount, 0));

    const settlementsCompleted = settlements.filter(s => s.status === SETTLEMENT_STATUS.COMPLETED || s.status === SETTLEMENT_STATUS.CONFIRMED).length;

    const circleData = {};
    expenses.forEach(e => {
      const cid = e.circle?.toString();
      if (!cid) return;
      if (!circleData[cid]) circleData[cid] = { id: cid, name: circleNameMap[cid] || 'A circle', value: 0, count: 0 };
      circleData[cid].value = roundTo(circleData[cid].value + e.amount);
      circleData[cid].count++;
    });
    const mostActiveCircle = Object.values(circleData).sort((a, b) => b.value - a.value)[0] || null;

    return {
      lifetimePaid,
      lifetimeReceived,
      lifetimeGiven,
      averageExpense,
      largestExpense,
      expensesThisMonth: expensesThisMonth.length,
      thisMonthSpent,
      settlementsCompleted,
      expenseCount,
      mostActiveCircle,
    };
  }

  // ─── Minimum Transfer Algorithm (standalone) ───────────────────
  // Used by settlement engine

  calculateSettlements(netBalances) {
    return this._minimumTransferAlgorithm(netBalances);
  }

  // ─── Circle Financial Summary (cached wrapper) ─────────────────

  async getCircleFinancialSummary(circleId, userId) {
    return this.getCircleSummary(circleId, userId);
  }
}

module.exports = new FinancialEngine();
