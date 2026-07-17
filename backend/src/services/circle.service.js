/**
 * ExpenseFlow - Circle Service
 * Business logic for circle/group management, members, and invitations.
 */
const { Circle, Member, Invitation, User, ActivityLog, Expense, ExpenseSplit, Settlement, Transaction } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateToken, roundTo } = require('../utils/helpers');
const { ROLES, INVITATION_STATUS, ACTIVITY_TYPES, NOTIFICATION_TYPES, TIME } = require('../constants');
const financialEngine = require('./financial.engine');
const { warn, info } = require('../utils/logger');
const { emitToCircle } = require('../socket');
const emailService = require('./email/EmailService');

/**
 * Fire-and-forget notifications — must never break circle operations.
 */
async function notifyCircle(circleId, excludeUserId, type, title, message, data = {}, meta = {}) {
  try {
    const { notificationService } = require('./index');
    await notificationService.notifyCircleMembers(circleId, excludeUserId, type, title, message, data, meta);
  } catch (err) {
    warn('[circle.service] notifyCircle failed:', err.message);
  }
}

async function notifyUser(userId, type, title, message, data = {}, meta = {}) {
  try {
    const { notificationService } = require('./index');
    await notificationService.notifyUser(userId, type, title, message, data, meta);
  } catch (err) {
    warn('[circle.service] notifyUser failed:', err.message);
  }
}

class CircleService {
  /**
   * Create a new circle
   */
  async createCircle(userId, data) {
    // Get user's currency preference
    const user = await User.findById(userId).select('preferences.currency');
    const userCurrency = user?.preferences?.currency || 'USD';

    const circle = await Circle.create({
      ...data,
      owner: userId,
      currency: data.currency || userCurrency, // Use user's preferred currency if not specified
    });

    // Add creator as owner member
    await Member.create({
      user: userId,
      circle: circle._id,
      role: ROLES.OWNER,
      joinedAt: new Date(),
    });

    // Log activity
    await ActivityLog.create({
      circle: circle._id,
      user: userId,
      type: ACTIVITY_TYPES.CIRCLE_CREATED,
      description: `Created circle "${circle.name}"`,
    });

    // Populate owner and return
    await circle.populate('owner', 'name email avatar');
    return circle;
  }

  /**
   * Get circle by ID
   */
  async getCircle(circleId, userId) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false })
      .populate('owner', 'name email avatar')
      .populate({
        path: 'recentExpenses',
        options: { sort: { date: -1 }, limit: 10 },
        populate: { path: 'paidBy', select: 'name email avatar' },
      })
      .populate({
        path: 'settlements',
        options: { sort: { createdAt: -1 } },
        populate: [
          { path: 'from', select: 'name email avatar' },
          { path: 'to', select: 'name email avatar' },
        ],
      })
      .populate({
        path: 'activity',
        options: { sort: { createdAt: -1 } },
        populate: { path: 'user', select: 'name email avatar' },
      });

    if (!circle) throw ApiError.notFound('Circle not found');

    const members = await Member.find({ circle: circleId, isActive: true, isDeleted: false })
      .populate('user', 'name email avatar')
      .sort({ role: -1, joinedAt: 1 })
      .lean();

    const isMember = members.some((m) => (m.user?._id || m.user).toString() === userId);
    if (!isMember) throw ApiError.forbidden('You are not a member of this circle');

    const circleSummary = await financialEngine.getCircleSummary(circleId, userId);
    const totalSpent = circleSummary.totalSpent;
    const expenseCount = circleSummary.expenseCount;
    const lastActivityDate = circleSummary.largestExpense?.date || circleSummary.monthlyTrend?.[circleSummary.monthlyTrend.length - 1]?.month || null;

    circle.totalSpent = totalSpent;
    circle.expenseCount = expenseCount;
    circle.lastActivity = lastActivityDate ? new Date(lastActivityDate).toLocaleDateString() : 'recently';
    circle.members = members;
    circle.memberCount = members.length;

    return circle;
  }

  /**
   * Get all circles for a user
   */
  async getUserCircles(userId, query = {}) {
    const { page = 1, limit = 20, search, archived } = query;
    const skip = (page - 1) * limit;

    const memberFilter = { user: userId, isActive: true, isDeleted: false };
    const members = await Member.find(memberFilter).select('circle role');

    const circleIds = members.map((m) => m.circle);
    const roleMap = {};
    members.forEach((m) => { roleMap[m.circle.toString()] = m.role; });

    const circleFilter = { _id: { $in: circleIds }, isDeleted: false };
    if (archived === 'true') circleFilter.isArchived = true;
    if (archived === 'false') circleFilter.isArchived = false;
    if (search) {
      circleFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [circles, total] = await Promise.all([
      Circle.find(circleFilter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email avatar')
        .lean(),
      Circle.countDocuments(circleFilter),
    ]);

    const allCircleMembers = await Member.find({
      circle: { $in: circleIds },
      isActive: true,
      isDeleted: false,
    })
      .populate('user', 'name email avatar')
      .lean();

    const membersByCircle = allCircleMembers.reduce((acc, m) => {
      const key = m.circle.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {});

    const circlesWithRole = circles.map((circle) => {
      const obj = circle.toObject ? circle.toObject({ virtuals: true }) : { ...circle };
      return {
        ...obj,
        members: membersByCircle[obj._id.toString()] || [],
        memberCount: (membersByCircle[obj._id.toString()] || []).length,
        userRole: roleMap[obj._id.toString()] || null,
      };
    });

    return {
      circles: circlesWithRole,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update circle
   */
  async updateCircle(circleId, userId, data) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member || (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can update the circle');
    }

    const allowedFields = ['name', 'description', 'currency', 'maxMembers', 'coverImage'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) circle[field] = data[field];
    });

    await circle.save();

    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.CIRCLE_UPDATED,
      description: `Updated circle "${circle.name}"`,
    });

    // Populate owner and return
    await circle.populate('owner', 'name email avatar');
    return circle;
  }

    /**
     * Delete circle (soft delete)
     */
    async deleteCircle(circleId, userId) {
      const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
      if (!circle) throw ApiError.notFound('Circle not found');

      if (circle.owner.toString() !== userId) {
        throw ApiError.forbidden('Only the owner can delete the circle');
      }

      await circle.softDelete(userId);

      await Member.updateMany(
        { circle: circleId },
        { isActive: false, isDeleted: true, leftAt: new Date() }
      );

      // Balances are computed on-demand via FinancialEngine. No stored balance updates.

      await ActivityLog.create({
        circle: circleId,
        user: userId,
        type: ACTIVITY_TYPES.CIRCLE_DELETED,
        description: `Deleted circle "${circle.name}"`,
      });
    }

  /**
   * Archive/unarchive circle
   */
  async archiveCircle(circleId, userId, archive = true) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member || (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can archive the circle');
    }

    if (archive) {
      await circle.archive(userId);
    } else {
      await circle.unarchive();
    }

    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.CIRCLE_ARCHIVED,
      description: archive ? `Archived circle "${circle.name}"` : `Unarchived circle "${circle.name}"`,
    });

    // Automatic notification (Sprint 2 / 8): inform members of the archive state change.
    await notifyCircle(
      circleId,
      userId,
      NOTIFICATION_TYPES.CIRCLE_ARCHIVED,
      `${archive ? 'Circle archived' : 'Circle restored'}: ${circle.name}`,
      `${archive ? 'Archived' : 'Restored'} circle "${circle.name}"`,
      { circleId },
      {}
    );

    return circle;
  }

  /**
   * Invite member to circle by email
   */
  async inviteMember(circleId, userId, { email, role, message }) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    const inviter = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!inviter || (inviter.role !== ROLES.OWNER && inviter.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can invite members');
    }

    // Check if user exists
    const invitedUser = await User.findOne({ email });
    if (invitedUser) {
      // Check if already a member
      const existingMember = await Member.findOne({ user: invitedUser._id, circle: circleId });
      if (existingMember && existingMember.isActive) {
        throw ApiError.conflict('User is already a member of this circle');
      }
      if (existingMember && !existingMember.isActive) {
        // Reactivate
        existingMember.isActive = true;
        existingMember.isDeleted = false;
        existingMember.leftAt = null;
        existingMember.role = role;
        await existingMember.save();
        return { member: existingMember, isNew: false };
      }
    }

    // Check member limit
    const activeMembers = await Member.countDocuments({ circle: circleId, isActive: true });
    if (activeMembers >= circle.maxMembers) {
      throw ApiError.badRequest('Circle has reached maximum member capacity');
    }

    // Check for pending invitation
    const existingInvite = await Invitation.findOne({
      circle: circleId,
      invitedEmail: email,
      status: INVITATION_STATUS.PENDING,
    });
    if (existingInvite) {
      throw ApiError.conflict('An invitation has already been sent to this email');
    }

    const token = generateToken(32);
    const invitation = await Invitation.create({
      circle: circleId,
      invitedBy: userId,
      invitedEmail: email,
      invitedUser: invitedUser?._id || null,
      role,
      token,
      expiresAt: new Date(Date.now() + 7 * TIME.ONE_DAY),
      message: message || '',
    });

// Send invitation email (fire-and-forget, never breaks invitation flow)
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviterUser = await User.findById(userId).select('name');
    emailService.sendInvitationEmail(
      email,
      inviterUser?.name || 'A user',
      circle.name,
      token,
      appUrl
    )
      .then(() => info(`[circle.service] Invitation email sent to ${email}`))
      .catch((err) => warn(`[circle.service] Invitation email failed:`, err.message));

    return { invitation, token, isEmailInvite: true };
  }

  /**
   * Add a member by name only (no email, no invitation)
   * Creates a guest member that appears in the circle without an account.
   */
  async addMemberByName(circleId, userId, { name, role }) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    const inviter = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!inviter || (inviter.role !== ROLES.OWNER && inviter.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can add members');
    }

    // Check member limit
    const activeMembers = await Member.countDocuments({ circle: circleId, isActive: true });
    if (activeMembers >= circle.maxMembers) {
      throw ApiError.badRequest('Circle has reached maximum member capacity');
    }

    // Check for duplicate display name within the circle
    const existingGuest = await Member.findOne({
      circle: circleId,
      displayName: { $regex: new RegExp(`^${name}$`, 'i') },
      isGuest: true,
      isActive: true,
    });
    if (existingGuest) {
      throw ApiError.conflict(`A guest member named "${name}" already exists in this circle`);
    }

    const member = await Member.create({
      user: null,
      circle: circleId,
      role: role || ROLES.MEMBER,
      displayName: name.trim(),
      isGuest: true,
      status: 'guest',
      joinedAt: new Date(),
      invitedBy: userId,
    });

    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_JOINED,
      description: `Added "${name}" as a guest member`,
    });

    // Automatic notification (Sprint 2 / 8): tell existing members.
    const guestCircle = await Circle.findById(circleId).select('name').lean();
    await notifyCircle(
      circleId,
      userId,
      NOTIFICATION_TYPES.MEMBER_ADDED,
      `${name} added to ${guestCircle?.name || 'a circle'}`,
      `${name} was added as a member`,
      { circleId },
      { userName: name }
    );

    // Emit real-time socket event
    try {
      emitToCircle(circleId, 'member:added', {
        memberId: member._id,
        name,
        role: role || ROLES.MEMBER,
        isGuest: true,
        circleId,
        addedBy: userId,
      });
    } catch (err) {
      warn('[circle.service] socket emit failed:', err.message);
    }

    return { member, isGuest: true };
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token, userId) {
    const invitation = await Invitation.findOne({ token, status: INVITATION_STATUS.PENDING });
    if (!invitation) throw ApiError.notFound('Invalid or expired invitation');
    if (invitation.isExpired()) {
      invitation.status = INVITATION_STATUS.EXPIRED;
      await invitation.save();
      throw ApiError.badRequest('Invitation has expired');
    }

    const user = await User.findById(userId);
    if (!user || user.email !== invitation.invitedEmail) {
      throw ApiError.forbidden('This invitation was not sent to your email');
    }

    // Check member limit
    const activeMembers = await Member.countDocuments({ circle: invitation.circle, isActive: true });
    const circle = await Circle.findById(invitation.circle);
    if (activeMembers >= circle.maxMembers) {
      throw ApiError.badRequest('Circle has reached maximum member capacity');
    }

    // Create or reactivate member
    let member = await Member.findOne({ user: userId, circle: invitation.circle });
    if (member) {
      member.isActive = true;
      member.isDeleted = false;
      member.leftAt = null;
      member.role = invitation.role;
    } else {
      member = await Member.create({
        user: userId,
        circle: invitation.circle,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      });
    }
    await member.save();

    invitation.status = INVITATION_STATUS.ACCEPTED;
    invitation.respondedAt = new Date();
    await invitation.save();

    await ActivityLog.create({
      circle: invitation.circle,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_JOINED,
      description: `${user.name} joined the circle`,
    });

    // Automatic notification (Sprint 2 / 8): tell existing members.
    const joinedCircle = await Circle.findById(invitation.circle).select('name').lean();
    await notifyCircle(
      invitation.circle,
      userId,
      NOTIFICATION_TYPES.MEMBER_ADDED,
      `${user.name} joined ${joinedCircle?.name || 'a circle'}`,
      `${user.name} joined the circle`,
      { circleId: invitation.circle },
      { userName: user.name }
    );

    return await member.populate('user', 'name email avatar');
  }

  /**
   * Decline invitation
   */
  async declineInvitation(token) {
    const invitation = await Invitation.findOne({ token, status: INVITATION_STATUS.PENDING });
    if (!invitation) throw ApiError.notFound('Invalid or expired invitation');

    invitation.status = INVITATION_STATUS.DECLINED;
    invitation.respondedAt = new Date();
    await invitation.save();
  }

  /**
   * Remove member from circle
   */
  async removeMember(circleId, userId, memberId) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    const actor = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!actor || (actor.role !== ROLES.OWNER && actor.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can remove members');
    }

    const targetMember = await Member.findOne({ _id: memberId, circle: circleId, isActive: true });
    if (!targetMember) throw ApiError.notFound('Member not found');

    // Cannot remove owner
    if (targetMember.role === ROLES.OWNER) {
      throw ApiError.forbidden('Cannot remove the circle owner');
    }

    // Admin cannot remove another admin
    if (actor.role === ROLES.ADMIN && targetMember.role === ROLES.ADMIN) {
      throw ApiError.forbidden('Admins cannot remove other admins');
    }

    targetMember.isActive = false;
    targetMember.leftAt = new Date();
    await targetMember.save();

    // Balances are computed on-demand via FinancialEngine. No stored balance updates.

    const user = await User.findById(targetMember.user);
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_REMOVED,
      description: `${user.name} was removed from the circle`,
      metadata: { targetUserId: targetMember.user, memberId: targetMember._id },
    });

    // Automatic notification (Sprint 2 / 8): inform the circle and the removed member.
    const removedCircle = await Circle.findById(circleId).select('name').lean();
    const remover = await User.findById(userId).select('name').lean();
    const removerName = remover?.name || 'A user';
    await notifyCircle(
      circleId,
      userId,
      NOTIFICATION_TYPES.MEMBER_REMOVED,
      `${user.name} removed from ${removedCircle?.name || 'a circle'}`,
      `${removerName} removed ${user.name} from the circle`,
      { circleId },
      { userName: removerName }
    );
    await notifyUser(
      targetMember.user,
      NOTIFICATION_TYPES.MEMBER_REMOVED,
      `You were removed from ${removedCircle?.name || 'a circle'}`,
      `${removerName} removed you from the circle`,
      { circleId },
      { userName: removerName }
    );

    // Emit real-time socket event
    try {
      emitToCircle(circleId, 'member:removed', {
        memberId: targetMember._id,
        userId: targetMember.user,
        name: user?.name,
        circleId,
        removedBy: userId,
      });
    } catch (err) {
      warn('[circle.service] socket emit failed:', err.message);
    }
  }

  /**
   * Leave circle
   */
  async leaveCircle(circleId, userId) {
    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member) throw ApiError.notFound('You are not a member of this circle');

    if (member.role === ROLES.OWNER) {
      throw ApiError.forbidden('Owner cannot leave. Transfer ownership first or delete the circle.');
    }

    member.isActive = false;
    member.leftAt = new Date();
    await member.save();

    // Balances are computed on-demand via FinancialEngine. No stored balance updates.

    const user = await User.findById(userId);
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_LEFT,
      description: `${user.name} left the circle`,
    });

    // Automatic notification (Sprint 2 / 8): inform remaining members.
    const leftCircle = await Circle.findById(circleId).select('name').lean();
    await notifyCircle(
      circleId,
      userId,
      NOTIFICATION_TYPES.MEMBER_REMOVED,
      `${user.name} left ${leftCircle?.name || 'a circle'}`,
      `${user.name} left the circle`,
      { circleId },
      { userName: user.name }
    );

    // Emit real-time socket event
    try {
      emitToCircle(circleId, 'member:left', {
        memberId: member._id,
        userId,
        name: user.name,
        circleId,
      });
    } catch (err) {
      warn('[circle.service] socket emit failed:', err.message);
    }
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(circleId, userId, newOwnerId) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    if (circle.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the owner can transfer ownership');
    }

    const newOwnerMember = await Member.findOne({ user: newOwnerId, circle: circleId, isActive: true });
    if (!newOwnerMember) throw ApiError.notFound('New owner is not a member of this circle');

    // Demote current owner to admin
    const currentOwnerMember = await Member.findOne({ user: userId, circle: circleId });
    currentOwnerMember.role = ROLES.ADMIN;
    await currentOwnerMember.save();

    // Promote new owner
    newOwnerMember.role = ROLES.OWNER;
    await newOwnerMember.save();

    // Update circle owner
    circle.owner = newOwnerId;
    await circle.save();
  }

  /**
   * Get pending invitations for a circle
   */
  async getCircleInvitations(circleId, userId) {
    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member || (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN)) {
      throw ApiError.forbidden('Only owner and admins can view invitations');
    }

    return Invitation.find({ circle: circleId })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(circleId, userId, memberId, newRole) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    if (circle.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the circle owner can change member roles');
    }

    if (![ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER].includes(newRole)) {
      throw ApiError.badRequest('Invalid role');
    }

    const member = await Member.findOne({ _id: memberId, circle: circleId, isActive: true });
    if (!member) throw ApiError.notFound('Member not found');

    if (member.user.toString() === userId) {
      throw ApiError.forbidden('You cannot change your own role');
    }

    const oldRole = member.role;
    if (oldRole === newRole) {
      return await member.populate('user', 'name email avatar');
    }

    member.role = newRole;
    await member.save();

    const user = await User.findById(member.user);
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_ROLE_CHANGED,
      description: `${user.name} role changed from ${oldRole} to ${newRole}`,
      metadata: { targetUserId: member.user, memberId: member._id, oldRole, newRole },
    });

    return await member.populate('user', 'name email avatar');
  }

  /**
   * Get all people the current user shares money with, aggregated across every
   * circle. Returns registered users, guest members and pending invitations
   * with per-person balances, roles, member type and circle membership so the
   * People page can render the full business workflow (Owner/Member,
   * Registered/Guest/Pending, Paid, Share, Balance, Owed, To Receive, etc.).
   */
  async getPeople(userId) {
    const memberships = await Member.find({ user: userId, isActive: true, isDeleted: false })
      .select('circle role')
      .lean();
    const circleIds = memberships.map((m) => m.circle);

    // All members across the user's circles (active, not deleted).
    const circleMembers = await Member.find({
      circle: { $in: circleIds },
      isActive: true,
      isDeleted: false,
    })
      .populate('user', 'name email avatar')
      .populate('circle', 'name currency')
      .lean();

    // Pending invitations for those circles (people not yet members).
    const { Invitation } = require('../models');
    const pendingInvites = await Invitation.find({
      circle: { $in: circleIds },
      status: INVITATION_STATUS.PENDING,
      expiresAt: { $gt: new Date() },
    })
      .populate('circle', 'name')
      .populate('invitedBy', 'name')
      .lean();

    const peopleMap = new Map();

    const keyFor = (m) => (m.user ? m.user._id.toString() : `guest:${m.displayName || m._id.toString()}`);

    for (const m of circleMembers) {
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

      if (m.role === ROLES.OWNER) base.ownerOf += 1;
      base.memberCount += 1;
      base.circleCount += 1;

      const circleSummary = await financialEngine.getCircleSummary(m.circle.toString(), userId);
      const memberIdKey = m.user ? m.user._id.toString() : m._id.toString();
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
      if (m.joinedAt && (!base.lastActivity || new Date(m.joinedAt) > new Date(base.lastActivity))) {
        base.lastActivity = m.joinedAt;
      }
      peopleMap.set(key, base);
    }

    // Pending invitations become "pending" people entries.
    for (const inv of pendingInvites) {
      const key = `pending:${inv.invitedEmail}`;
      if (peopleMap.has(key)) continue; // already a member
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

  /**
   * Get user's pending invitations
   */
  async getUserInvitations(userId) {
    const user = await User.findById(userId);
    return Invitation.find({
      invitedEmail: user.email,
      status: INVITATION_STATUS.PENDING,
      expiresAt: { $gt: new Date() },
    })
      .populate('circle', 'name')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Promote a member (only owner can promote)
   */
  async promoteMember(circleId, userId, memberId, newRole) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    if (circle.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the circle owner can promote members');
    }

    if (![ROLES.ADMIN, ROLES.MEMBER].includes(newRole)) {
      throw ApiError.badRequest('Cannot promote to owner role. Use transfer ownership instead.');
    }

    const member = await Member.findOne({ _id: memberId, circle: circleId, isActive: true });
    if (!member) throw ApiError.notFound('Member not found');
    if (member.role === ROLES.OWNER) {
      throw ApiError.forbidden('Cannot modify the owner role');
    }

    const oldRole = member.role;
    member.role = newRole;
    await member.save();

    const user = await User.findById(member.user);
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_JOINED,
      description: `${user.name} was promoted from ${oldRole} to ${newRole}`,
      metadata: { targetUserId: member.user, memberId: member._id, oldRole, newRole },
    });

    return await member.populate('user', 'name email avatar');
  }

  /**
   * Demote a member (only owner can demote)
   */
  async demoteMember(circleId, userId, memberId, newRole) {
    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });
    if (!circle) throw ApiError.notFound('Circle not found');

    if (circle.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the circle owner can demote members');
    }

    if (![ROLES.MEMBER, ROLES.VIEWER].includes(newRole)) {
      throw ApiError.badRequest('Invalid role for demotion');
    }

    const member = await Member.findOne({ _id: memberId, circle: circleId, isActive: true });
    if (!member) throw ApiError.notFound('Member not found');
    if (member.role === ROLES.OWNER) {
      throw ApiError.forbidden('Cannot demote the owner role');
    }

    const oldRole = member.role;
    member.role = newRole;
    await member.save();

    const user = await User.findById(member.user);
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_JOINED,
      description: `${user.name} was demoted from ${oldRole} to ${newRole}`,
      metadata: { targetUserId: member.user, memberId: member._id, oldRole, newRole },
    });

    return await member.populate('user', 'name email avatar');
  }
  /**
   * Link a name-only (guest) member to a freshly registered user account,
   * preserving every financial record (paid / owed / settlements / expenses).
   *
   * This is the core of the Guest Member Lifecycle (Phase D, Step 6):
   * a guest who has been participating in circles can later register, and
   * ExpenseFlow merges their guest identity into the new account with no
   * financial history lost and no duplicate members.
   *
   * All references that previously pointed at the guest member document id
   * (expense paidBy, expense splits, settlements, transactions) are remapped
   * to the real user id so the rest of the platform stays consistent.
   */
  async linkGuestMember(memberId, userId) {
    const guest = await Member.findOne({ _id: memberId, isGuest: true, user: null, isDeleted: false });
    if (!guest) return { linked: false, reason: 'not_a_guest' };

    const circleId = guest.circle;

    // Determine the canonical Member._id for this user in this circle.
    // If they already have a registered member record, use that Member._id.
    // Otherwise, the guest member itself becomes the registered member.
    const existing = await Member.findOne({ user: userId, circle: circleId, isActive: true, isDeleted: false });
    const canonicalMemberId = existing ? existing._id : guest._id;

    // Remap every financial reference from the guest member id to the canonical Member._id.
    await ExpenseSplit.updateMany({ user: guest._id }, { $set: { user: canonicalMemberId } });
    await Expense.updateMany({ paidBy: guest._id }, { $set: { paidBy: canonicalMemberId } });
    await Settlement.updateMany({ from: guest._id }, { $set: { from: canonicalMemberId } });
    await Settlement.updateMany({ to: guest._id }, { $set: { to: canonicalMemberId } });
    await Transaction.updateMany({ from: guest._id }, { $set: { from: canonicalMemberId } });
    await Transaction.updateMany({ to: guest._id }, { $set: { to: canonicalMemberId } });

    // If the user is already a registered member of this circle (e.g. they
    // accepted an invitation earlier), remove the now-redundant guest record.
    if (existing) {
      await Member.deleteOne({ _id: guest._id });
    } else {
      guest.user = userId;
      guest.isGuest = false;
      guest.status = 'registered';
      guest.isActive = true;
      await guest.save();
    }

    // Recompute every member's balance from scratch for consistency.
    await financialEngine.getCircleSummary(circleId);

    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: ACTIVITY_TYPES.MEMBER_JOINED,
      description: `${guest.displayName || 'A guest'} linked their guest profile to a registered account`,
      metadata: { linkedFrom: guest._id, displayName: guest.displayName },
    });

    await notifyUser(
      userId,
      NOTIFICATION_TYPES.GUEST_REGISTERED,
      'Guest account linked',
      `Your guest profile "${guest.displayName || 'guest'}" is now part of your account. All balances are preserved.`,
      { circleId, displayName: guest.displayName },
      { userName: guest.displayName || 'guest' }
    );

    return { linked: true, circleId, displayName: guest.displayName };
  }

  /**
   * Find guest members whose display name matches a registering user, so the
   * platform can prompt "We found a Guest Member named X. Is this you?".
   */
  async findMatchingGuests(name) {
    const allGuests = await Member.find({
      isGuest: true,
      user: null,
      isActive: true,
      isDeleted: false,
    })
      .populate('circle', 'name')
      .lean();

    const normalize = (s) => (s || '').trim().toLowerCase();
    const firstToken = (s) => normalize(s).split(/\s+/)[0];

    return allGuests
      .filter((g) => {
        const a = normalize(name);
        const b = normalize(g.displayName);
        if (!a || !b) return false;
        if (a === b) return true;
        return firstToken(name) === firstToken(g.displayName);
      })
      .map((g) => ({
        memberId: g._id,
        circleId: g.circle?._id || null,
        circleName: g.circle?.name || null,
        displayName: g.displayName,
      }));
  }
}

module.exports = new CircleService();