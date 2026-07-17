/**
 * ExpenseFlow - Settlement Service
 * Settlement calculation engine with debt simplification and balance computation.
 *
 * IDENTITY RESOLUTION: All financial references use canonical Circle Member._id.
 * User._id (from JWT) is resolved to Member._id at the entry point of each method.
 */
const { Settlement, Member, Circle, ActivityLog, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { roundTo } = require('../utils/helpers');
const { SETTLEMENT_STATUS, ACTIVITY_TYPES, NOTIFICATION_TYPES } = require('../constants');
const financialEngine = require('./financial.engine');
const { warn } = require('../utils/logger');
const { emitToCircle } = require('../socket');

/**
 * Fire-and-forget notifications — must never break the settlement workflow.
 */
async function notifyUser(userId, type, title, message, data = {}, meta = {}) {
  try {
    const { notificationService } = require('./index');
    await notificationService.notifyUser(userId, type, title, message, data, meta);
  } catch (err) {
    warn('[settlement.service] notifyUser failed:', err.message);
  }
}

async function recalculateExpenseStatuses(circleId) {
  try {
    const expenseService = require('./expense.service');
    await expenseService.recalculateExpenseStatuses(circleId);
  } catch (err) {
    warn('[settlement.service] recalculateExpenseStatuses failed:', err.message);
  }
}

class SettlementService {
  async calculateNetBalances(circleId) {
    const circle = await Circle.findById(circleId);
    if (!circle) throw ApiError.notFound('Circle not found');
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject settlement operations');
    if (circle.isArchived) throw ApiError.badRequest('Archived circles cannot create new settlements');

    const summary = await financialEngine.getCircleSummary(circleId);
    return summary.memberBalances.map(b => ({
      userId: b.userId,
      user: { _id: b.userId, name: b.name, email: '' },
      totalPaid: b.totalPaid,
      totalOwed: b.totalOwed,
      netBalance: b.netBalance,
    }));
  }

  _dbReady() {
    try {
      return require('mongoose').connection.readyState === 1;
    } catch {
      return false;
    }
  }

  async getSuggestedSettlements(circleId) {
    const circle = await Circle.findById(circleId);
    if (!circle) throw ApiError.notFound('Circle not found');
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject settlement operations');
    if (circle.isArchived) throw ApiError.badRequest('Archived circles cannot create new settlements');

    const summary = await financialEngine.getCircleSummary(circleId);
    const balances = summary.memberBalances.map(b => ({
      userId: b.userId,
      user: { _id: b.userId, name: b.name, email: '' },
      totalPaid: b.totalPaid,
      totalOwed: b.totalOwed,
      netBalance: b.netBalance,
    }));

    const suggested = summary.settlementSuggestions.map(s => ({
      from: { _id: s.fromId, name: s.fromName, email: '' },
      to: { _id: s.toId, name: s.toName, email: '' },
      amount: s.amount,
    }));

    const existingSettlements = await Settlement.find({
      circle: circleId,
      status: { $in: [SETTLEMENT_STATUS.PENDING, SETTLEMENT_STATUS.CONFIRMED, SETTLEMENT_STATUS.COMPLETED] },
      isDeleted: false,
    })
      .populate({
        path: 'from',
        select: 'displayName nickname user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate({
        path: 'to',
        select: 'displayName nickname user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .sort({ createdAt: -1 });

    return {
      balances,
      suggestedSettlements: suggested,
      existingSettlements,
    };
  }

  async getSettlements(circleId, userId, query = {}) {
    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    const circle = await Circle.findById(circleId);
    if (!circle) throw ApiError.notFound('Circle not found');

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const filter = { circle: circleId, isDeleted: false };
    if (status) filter.status = status;

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'from',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        })
        .populate({
          path: 'to',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        }),
      Settlement.countDocuments(filter),
    ]);

    return {
      settlements,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSettlementById(settlementId, userId) {
    const settlement = await Settlement.findOne({ _id: settlementId, isDeleted: false })
      .populate({
        path: 'from',
        select: 'displayName nickname user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate({
        path: 'to',
        select: 'displayName nickname user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate('circle', 'name currency');

    if (!settlement) throw ApiError.notFound('Settlement not found');

    const member = await Member.findOne({ user: userId, circle: settlement.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');

    return settlement;
  }

  async createSettlement(userId, data) {
    const { circleId, from, to, amount, currency, paymentMethod, paymentReference, note } = data;

    const circle = await Circle.findById(circleId);
    if (!circle) throw ApiError.notFound('Circle not found');
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject settlement operations');
    if (circle.isArchived) throw ApiError.badRequest('Archived circles cannot create new settlements');

    const callerMember = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!callerMember) throw ApiError.forbidden('You are not a member of this circle');
    const callerMemberId = callerMember._id.toString();

    const isCircleOwner = String(circle.owner) === String(userId);
    const fromUserId = from || callerMemberId;

    if (!isCircleOwner && fromUserId !== callerMemberId) {
      throw ApiError.forbidden('Only circle owner can create settlements on behalf of others');
    }

    const fromMember = await Member.findOne({
      $or: [{ user: fromUserId }, { _id: fromUserId }],
      circle: circleId,
      isActive: true,
    });
    if (!fromMember) throw ApiError.forbidden('Payer is not a member of this circle');

    const toMember = await Member.findOne({
      $or: [{ user: to }, { _id: to }],
      circle: circleId,
      isActive: true,
    });
    if (!toMember) throw ApiError.forbidden('Receiver is not a member of this circle');

    if (fromUserId === to) {
      throw ApiError.badRequest('Cannot settle with yourself');
    }

    const balances = await this.calculateNetBalances(circleId);
    const fromMemberId = fromMember._id.toString();
    const toMemberId = toMember._id.toString();
    const payerBalance = balances.find((b) => b.userId === fromMemberId);
    const receiverBalance = balances.find((b) => b.userId === toMemberId);

    if (!payerBalance || !receiverBalance) {
      throw ApiError.badRequest('Balance information not found');
    }

    if (payerBalance.netBalance >= -0.01) {
      throw ApiError.badRequest('Payer does not owe any balance in this circle');
    }

    if (amount > Math.abs(payerBalance.netBalance) + 0.01) {
      throw ApiError.badRequest('Settlement amount exceeds what the payer owes');
    }

    const settlement = await Settlement.create({
      circle: circleId,
      from: fromMemberId,
      to: toMemberId,
      amount,
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'other',
      paymentReference: paymentReference || '',
      note: note || '',
      remainingAmount: amount,
      status: SETTLEMENT_STATUS.PENDING,
      recordedBy: isCircleOwner && fromMemberId !== callerMemberId ? userId : undefined,
    });

    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.SETTLEMENT_CREATED,
      description: isCircleOwner && fromMemberId !== callerMemberId ? `Recorded settlement of ${amount} on behalf of ${payerBalance.name}` : `Created settlement of ${amount}`,
      metadata: { settlementId: settlement._id, amount, recordedFor: fromMemberId },
    });

    try {
      emitToCircle(circleId, 'settlement:created', {
        settlementId: settlement._id,
        from: fromMemberId,
        to: toMemberId,
        amount,
        currency: currency || 'USD',
        status: SETTLEMENT_STATUS.PENDING,
        circleId,
        recordedBy: isCircleOwner && fromMemberId !== callerMemberId ? userId : undefined,
      });
    } catch (err) {
      warn('[settlement.service] socket emit failed:', err.message);
    }

    return await settlement.populate([
      { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
    ]);
  }

  async confirmSettlement(settlementId, userId) {
    const settlement = await Settlement.findOne({ _id: settlementId, isDeleted: false });
    if (!settlement) throw ApiError.notFound('Settlement not found');

    const member = await Member.findOne({ user: userId, circle: settlement.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');
    const memberId = member._id.toString();

    // Resolve settlement.from and settlement.to to Member._id for comparison
    // This handles both legacy User._id and canonical Member._id values
    const toIsMember = await Member.exists({ _id: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false });

    let toMemberId = settlement.to.toString();

    if (!toIsMember) {
      // Legacy User._id - find the corresponding Member in this circle
      const toMember = await Member.findOne({ user: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (toMember) toMemberId = toMember._id.toString();
    }

    if (toMemberId !== memberId) {
      const isCircleOwner = await Circle.exists({ _id: settlement.circle, owner: userId });
      const isRecorder = settlement.recordedBy && settlement.recordedBy.toString() === userId;
      if (!isCircleOwner && !isRecorder) {
        throw ApiError.forbidden('Only the receiver can confirm this settlement');
      }
    }

    if (settlement.status === SETTLEMENT_STATUS.CANCELLED) {
      throw ApiError.badRequest('Cannot confirm a cancelled settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.EXPIRED) {
      throw ApiError.badRequest('Cannot confirm an expired settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.CONFIRMED) {
      return await settlement.populate([
        { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
        { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      ]);
    }

    if (settlement.status === SETTLEMENT_STATUS.COMPLETED) {
      return await settlement.populate([
        { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
        { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      ]);
    }

    settlement.status = SETTLEMENT_STATUS.CONFIRMED;
    settlement.confirmedByReceiver = true;
    settlement.confirmedAt = new Date();
    await settlement.save();

    await ActivityLog.create({
      circle: settlement.circle,
      user: userId,
      type: ACTIVITY_TYPES.SETTLEMENT_CONFIRMED,
      description: `Confirmed settlement of ${settlement.amount}`,
      metadata: { settlementId: settlement._id, amount: settlement.amount },
    });

    const confirmCurrency = settlement.currency || 'USD';
    const confirmCircle = await Circle.findById(settlement.circle).select('name').lean();
    const confirmActor = await User.findById(userId).select('name').lean();
    const confirmActorName = confirmActor?.name || 'A user';
    // Use resolved Member._id for notifyUser
    const payerMemberId = settlement.from.toString();
    await notifyUser(
      payerMemberId,
      NOTIFICATION_TYPES.SETTLEMENT_CONFIRMED,
      `Settlement confirmed in ${confirmCircle?.name || 'a circle'}`,
      `${confirmActorName} confirmed your settlement of ${confirmCurrency} ${settlement.amount}`,
      { settlementId: settlement._id, circleId: settlement.circle, amount: settlement.amount, currency: confirmCurrency },
      { userName: confirmActorName, amount: settlement.amount, currency: confirmCurrency }
    );

    try {
      emitToCircle(settlement.circle, 'settlement:confirmed', {
        settlementId: settlement._id,
        amount: settlement.amount,
        currency: settlement.currency,
        confirmedBy: userId,
        circleId: settlement.circle,
      });
    } catch (err) {
      warn('[settlement.service] socket emit failed:', err.message);
    }

    await recalculateExpenseStatuses(settlement.circle);

    return await settlement.populate([
      { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
    ]);
  }

  async completeSettlement(settlementId, userId) {
    const settlement = await Settlement.findOne({ _id: settlementId, isDeleted: false });
    if (!settlement) throw ApiError.notFound('Settlement not found');

    const member = await Member.findOne({ user: userId, circle: settlement.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');
    const memberId = member._id.toString();

    // Resolve settlement.from and settlement.to to Member._id for comparison
    // This handles both legacy User._id and canonical Member._id values
    // Check if the stored ID is a Member._id or User._id
    const fromIsMember = await Member.exists({ _id: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false });
    const toIsMember = await Member.exists({ _id: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false });

    // Get the canonical Member._id for comparison
    let fromMemberId = settlement.from.toString();
    let toMemberId = settlement.to.toString();

    // Check if the stored ID is a valid User._id first (for backward compatibility)
    const User = require('../models').User;
    const fromUserExists = await User.exists({ _id: settlement.from });
    const toUserExists = await User.exists({ _id: settlement.to });

    if (!fromIsMember && fromUserExists) {
      // Legacy User._id - find the corresponding Member in this circle
      const fromMember = await Member.findOne({ user: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (fromMember) {
        fromMemberId = fromMember._id.toString();
      } else if (settlement.from.toString() === userId) {
        // User exists but not in this circle - this is a data integrity issue
        // For now, allow the operation if the user is trying to complete their own settlement
        fromMemberId = memberId; // Use the requesting user's memberId
      }
    }

    if (!toIsMember && toUserExists) {
      // Legacy User._id - find the corresponding Member in this circle
      const toMember = await Member.findOne({ user: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (toMember) {
        toMemberId = toMember._id.toString();
      } else if (settlement.to.toString() === userId) {
        // User exists but not in this circle - this is a data integrity issue
        // For now, allow the operation if the user is trying to complete their own settlement
        toMemberId = memberId; // Use the requesting user's memberId
      }
    }

    const isCircleOwner = await Circle.exists({ _id: settlement.circle, owner: userId });
    const isRecorder = settlement.recordedBy && settlement.recordedBy.toString() === userId;
    if (fromMemberId !== memberId && toMemberId !== memberId && !isCircleOwner && !isRecorder) {
      throw ApiError.forbidden('Only involved parties can complete this settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.CANCELLED) {
      throw ApiError.badRequest('Cannot complete a cancelled settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.EXPIRED) {
      throw ApiError.badRequest('Cannot complete an expired settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.COMPLETED) {
      return await settlement.populate([
        { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
        { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      ]);
    }

    settlement.status = SETTLEMENT_STATUS.COMPLETED;
    settlement.completedAt = new Date();
    await settlement.save();

    await ActivityLog.create({
      circle: settlement.circle,
      user: userId,
      type: ACTIVITY_TYPES.SETTLEMENT_COMPLETED,
      description: `Completed settlement of ${settlement.amount}`,
      metadata: { settlementId: settlement._id, amount: settlement.amount },
    });

    // Use resolved Member._id for counterparty determination
    const counterparty = fromMemberId === memberId ? toMemberId : fromMemberId;
    const sCircle = await Circle.findById(settlement.circle).select('name currency').lean();
    const sActor = await User.findById(userId).select('name').lean();
    const sActorName = sActor?.name || 'A user';
    const sCurrency = sCircle?.currency || settlement.currency || 'USD';
    await notifyUser(
      counterparty,
      NOTIFICATION_TYPES.SETTLEMENT_COMPLETED,
      `Settlement completed in ${sCircle?.name || 'a circle'}`,
      `${sActorName} completed a settlement of ${sCurrency} ${settlement.amount}`,
      { settlementId: settlement._id, circleId: settlement.circle, amount: settlement.amount, currency: sCurrency },
      { userName: sActorName, amount: settlement.amount, currency: sCurrency }
    );

    try {
      emitToCircle(settlement.circle, 'settlement:completed', {
        settlementId: settlement._id,
        amount: settlement.amount,
        currency: settlement.currency,
        completedBy: userId,
        circleId: settlement.circle,
      });
    } catch (err) {
      warn('[settlement.service] socket emit failed:', err.message);
    }

    await recalculateExpenseStatuses(settlement.circle);

    return await settlement.populate([
      { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
    ]);
  }

  async partialSettlement(settlementId, userId, amount) {
    const settlement = await Settlement.findOne({ _id: settlementId, isDeleted: false });
    if (!settlement) throw ApiError.notFound('Settlement not found');

    const member = await Member.findOne({ user: userId, circle: settlement.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');
    const memberId = member._id.toString();

    // Resolve settlement.from and settlement.to to Member._id for comparison
    // This handles both legacy User._id and canonical Member._id values
    const fromIsMember = await Member.exists({ _id: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false });
    const toIsMember = await Member.exists({ _id: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false });

    let fromMemberId = settlement.from.toString();
    let toMemberId = settlement.to.toString();

    if (!fromIsMember) {
      // Legacy User._id - find the corresponding Member in this circle
      const fromMember = await Member.findOne({ user: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (fromMember) fromMemberId = fromMember._id.toString();
    }

    if (!toIsMember) {
      // Legacy User._id - find the corresponding Member in this circle
      const toMember = await Member.findOne({ user: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (toMember) toMemberId = toMember._id.toString();
    }

    if (settlement.status === SETTLEMENT_STATUS.CANCELLED) {
      throw ApiError.badRequest('Cannot process partial payment for a cancelled settlement');
    }

    if (settlement.status === SETTLEMENT_STATUS.EXPIRED) {
      throw ApiError.badRequest('Cannot process partial payment for an expired settlement');
    }

    if (settlement.remainingAmount <= 0.01) {
      return await settlement.populate([
        { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
        { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      ]);
    }

    const remaining = settlement.remainingAmount;
    const paid = roundTo(Math.min(amount, remaining));
    settlement.remainingAmount = roundTo(remaining - paid);

    if (settlement.remainingAmount <= 0.01) {
      settlement.status = SETTLEMENT_STATUS.COMPLETED;
      settlement.completedAt = new Date();
      if (!settlement.confirmedAt) {
        settlement.confirmedAt = new Date();
        settlement.confirmedByReceiver = true;
      }
    }

    await settlement.save();

    await ActivityLog.create({
      circle: settlement.circle,
      user: userId,
      type: ACTIVITY_TYPES.SETTLEMENT_CONFIRMED,
      description: `Partial payment of ${paid} on settlement (remaining: ${settlement.remainingAmount})`,
      metadata: { settlementId: settlement._id, paid, remaining: settlement.remainingAmount },
    });

    const partCurrency = settlement.currency || 'USD';
    const partCircle = await Circle.findById(settlement.circle).select('name currency').lean();
    const partActor = await User.findById(userId).select('name').lean();
    const partActorName = partActor?.name || 'A user';
    // Use resolved Member._id for counterparty determination
    const counterparty = fromMemberId === memberId ? toMemberId : fromMemberId;
    await notifyUser(
      counterparty,
      NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      `Payment received in ${partCircle?.name || 'a circle'}`,
      `${partActorName} paid ${partCurrency} ${paid} (remaining ${partCurrency} ${settlement.remainingAmount})`,
      { settlementId: settlement._id, circleId: settlement.circle, amount: paid, currency: partCurrency },
      { userName: partActorName, amount: paid, currency: partCurrency }
    );

    await recalculateExpenseStatuses(settlement.circle);

    return await settlement.populate([
      { path: 'from', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
      { path: 'to', select: 'displayName nickname user', populate: { path: 'user', select: 'name email avatar' } },
    ]);
  }

  async cancelSettlement(settlementId, userId) {
    const settlement = await Settlement.findOne({ _id: settlementId, isDeleted: false });
    if (!settlement) throw ApiError.notFound('Settlement not found');

    const member = await Member.findOne({ user: userId, circle: settlement.circle, isActive: true });
    if (!member) throw ApiError.forbidden('You are not a member of this circle');
    const memberId = member._id.toString();

    // Resolve settlement.from and settlement.to to Member._id for comparison
    // This handles both legacy User._id and canonical Member._id values
    const fromIsMember = await Member.exists({ _id: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false });
    const toIsMember = await Member.exists({ _id: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false });

    let fromMemberId = settlement.from.toString();
    let toMemberId = settlement.to.toString();

    if (!fromIsMember) {
      // Legacy User._id - find the corresponding Member in this circle
      const fromMember = await Member.findOne({ user: settlement.from, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (fromMember) fromMemberId = fromMember._id.toString();
    }

    if (!toIsMember) {
      // Legacy User._id - find the corresponding Member in this circle
      const toMember = await Member.findOne({ user: settlement.to, circle: settlement.circle, isActive: true, isDeleted: false }).select('_id').lean();
      if (toMember) toMemberId = toMember._id.toString();
    }

    if (fromMemberId !== memberId && toMemberId !== memberId) {
      const isCircleOwner = await Circle.exists({ _id: settlement.circle, owner: userId });
      const isRecorder = settlement.recordedBy && settlement.recordedBy.toString() === userId;
      if (!isCircleOwner && !isRecorder) {
        throw ApiError.forbidden('Only the payer or receiver can cancel this settlement');
      }
    }

    if (settlement.status === SETTLEMENT_STATUS.COMPLETED || settlement.status === SETTLEMENT_STATUS.CANCELLED) {
      return settlement;
    }

    settlement.status = SETTLEMENT_STATUS.CANCELLED;
    await settlement.save();

    await ActivityLog.create({
      circle: settlement.circle,
      user: userId,
      type: ACTIVITY_TYPES.SETTLEMENT_CANCELLED,
      description: `Cancelled settlement of ${settlement.amount}`,
      metadata: { settlementId: settlement._id, amount: settlement.amount },
    });

    const cancelCurrency = settlement.currency || 'USD';
    const cancelCircle = await Circle.findById(settlement.circle).select('name currency').lean();
    const cancelActor = await User.findById(userId).select('name').lean();
    const cancelActorName = cancelActor?.name || 'A user';
    // Use resolved Member._id for counterparty determination
    const counterparty = fromMemberId === memberId ? toMemberId : fromMemberId;
    await notifyUser(
      counterparty,
      NOTIFICATION_TYPES.SETTLEMENT_DUE,
      `Settlement cancelled in ${cancelCircle?.name || 'a circle'}`,
      `${cancelActorName} cancelled a settlement of ${cancelCurrency} ${settlement.amount}`,
      { settlementId: settlement._id, circleId: settlement.circle, amount: settlement.amount, currency: cancelCurrency },
      { userName: cancelActorName, amount: settlement.amount, currency: cancelCurrency }
    );

    await recalculateExpenseStatuses(settlement.circle);

    return settlement;
  }

  async getAllSettlements(userId, query = {}) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (status) filter.status = status;

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'from',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        })
        .populate({
          path: 'to',
          select: 'displayName nickname user',
          populate: { path: 'user', select: 'name email avatar' },
        }),
      Settlement.countDocuments(filter),
    ]);

    return {
      settlements,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async recalculateSettlements(circleId) {
    const circle = await Circle.findById(circleId);
    if (!circle) return null;
    if (circle.isDeleted) throw ApiError.badRequest('Deleted circles reject settlement operations');

    const pendingSettlements = await Settlement.find({ circle: circleId, status: SETTLEMENT_STATUS.PENDING, isDeleted: false });
    for (const s of pendingSettlements) {
      if (Math.abs(s.remainingAmount - s.amount) < 0.01) {
        s.status = SETTLEMENT_STATUS.CANCELLED;
        await s.save();
      }
    }

    const summary = await financialEngine.getCircleSummary(circleId);
    const settlements = summary.settlementSuggestions;

    for (const s of settlements) {
      await Settlement.create({
        circle: circleId,
        from: s.fromId,
        to: s.toId,
        amount: s.amount,
        currency: 'USD',
        paymentMethod: 'other',
        status: SETTLEMENT_STATUS.PENDING,
        remainingAmount: s.amount,
      });
    }
  }

  async expireOldSettlements(circleId, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await Settlement.updateMany(
      {
        circle: circleId,
        status: SETTLEMENT_STATUS.PENDING,
        createdAt: { $lt: cutoff },
        isDeleted: false,
      },
      { $set: { status: SETTLEMENT_STATUS.EXPIRED } }
    );

    return result.modifiedCount;
  }
}

module.exports = new SettlementService();
