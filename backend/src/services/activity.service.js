/**
 * ExpenseFlow - Activity Timeline Service
 * Provides audit timeline across circles.
 *
 * ACTIVITY RESOLUTION:
 *   ActivityLog.user stores canonical User._id. For backward compatibility
 *   with legacy data that may contain Member._id, activities are resolved
 *   through the canonical Member resolver after population.
 */
const { ActivityLog, Member, User } = require('../models');

const resolveActivityUser = async (activity) => {
  if (!activity.user) return activity;
  if (activity.user.name) return activity;
  
  const userId = typeof activity.user === 'string' ? activity.user : activity.user._id;
  if (!userId) return activity;
  
  const member = await Member.findOne({ user: userId, isActive: true, isDeleted: false })
    .populate('user', 'name email avatar')
    .lean();
  if (member?.user) {
    activity.user = { _id: member.user._id, name: member.user.name, email: member.user.email, avatar: member.user.avatar };
    return activity;
  }
  
  const user = await User.findById(userId).select('name email avatar').lean();
  if (user) {
    activity.user = { _id: user._id, name: user.name, email: user.email, avatar: user.avatar };
  }
  
  return activity;
};

class ActivityService {
  async getCircleActivities(circleId, userId, query = {}) {
    const { Member } = require('../models');
    const member = await Member.findOne({ user: userId, circle: circleId, isActive: true });
    if (!member) throw new Error('You are not a member of this circle');

    const { page = 1, limit = 20, type } = query;
    const skip = (page - 1) * limit;

    const filter = { circle: circleId, isDeleted: false };
    if (type) filter.type = type;

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email avatar'),
      ActivityLog.countDocuments(filter),
    ]);

    const resolvedActivities = await Promise.all(activities.map(resolveActivityUser));

    return {
      activities: resolvedActivities,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserActivities(userId, query = {}) {
    const { Member } = require('../models');
    const { page = 1, limit = 20, type, circleId } = query;
    const skip = (page - 1) * limit;

    const memberships = await Member.find({ user: userId, isActive: true }).select('circle');
    const circleIds = memberships.map((m) => m.circle);

    const filter = { circle: { $in: circleIds }, isDeleted: false };
    if (type) filter.type = type;
    if (circleId) filter.circle = circleId;

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email avatar'),
      ActivityLog.countDocuments(filter),
    ]);

    const resolvedActivities = await Promise.all(activities.map(resolveActivityUser));

    return {
      activities: resolvedActivities,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async createActivity(circleId, userId, type, description, metadata = {}) {
    return ActivityLog.create({
      circle: circleId,
      user: userId,
      type,
      description,
      metadata,
    });
  }
}

module.exports = new ActivityService();
