/**
 * ExpenseFlow - Identity Resolution Utilities
 *
 * Canonical identity for all financial operations is Circle Member._id.
 * This module resolves any identity (User._id, email, etc.) to the
 * canonical Member._id for a given circle.
 */

const mongoose = require('mongoose');
const { Member } = require('../models');

/**
 * Resolve a User._id to the canonical Member._id for a given circle.
 * This is the single entry point for identity resolution in the financial layer.
 *
 * @param {string} userId - User._id (from JWT / auth middleware)
 * @param {string} circleId - Circle._id
 * @returns {Promise<string|null>} Member._id as string, or null if not found
 */
async function resolveMemberId(userId, circleId) {
  if (!userId || !circleId) return null;

  const member = await Member.findOne({
    user: new mongoose.Types.ObjectId(userId),
    circle: new mongoose.Types.ObjectId(circleId),
    isActive: true,
    isDeleted: false,
  }).select('_id');

  return member ? member._id.toString() : null;
}

/**
 * Resolve a User._id to ALL active Member._ids across all circles.
 * Used for queries that span multiple circles.
 *
 * @param {string} userId - User._id
 * @returns {Promise<string[]>} Array of Member._id strings
 */
async function resolveAllMemberIds(userId) {
  if (!userId) return [];

  const members = await Member.find({
    user: new mongoose.Types.ObjectId(userId),
    isActive: true,
    isDeleted: false,
  }).select('_id');

  return members.map(m => m._id.toString());
}

/**
 * Resolve a User._id to the Member document for a circle.
 * Returns the full member document (not just _id).
 *
 * @param {string} userId - User._id
 * @param {string} circleId - Circle._id
 * @returns {Promise<Object|null>} Member document or null
 */
async function resolveMemberDocument(userId, circleId) {
  if (!userId || !circleId) return null;

  return Member.findOne({
    user: new mongoose.Types.ObjectId(userId),
    circle: new mongoose.Types.ObjectId(circleId),
    isActive: true,
    isDeleted: false,
  }).lean();
}

/**
 * Check if a given ID is a User._id or Member._id by looking it up.
 * Used for backward compatibility when reading existing mixed data.
 *
 * @param {string} id - The ID to check
 * @returns {Promise<Object>} { type: 'user'|'member'|'unknown', memberId?: string }
 */
async function identifyIdType(id) {
  if (!id) return { type: 'unknown' };

  // Check if it's a Member._id
  const member = await Member.findById(id).select('user isGuest').lean();
  if (member) {
    return { type: member.user ? 'member_registered' : 'member_guest', memberId: id };
  }

  // Check if it's a User._id by finding a member with this user
  const memberByUser = await Member.findOne({ user: id, isActive: true, isDeleted: false }).select('_id').lean();
  if (memberByUser) {
    return { type: 'user', memberId: memberByUser._id.toString() };
  }

  return { type: 'unknown' };
}

module.exports = {
  resolveMemberId,
  resolveAllMemberIds,
  resolveMemberDocument,
  identifyIdType,
};
