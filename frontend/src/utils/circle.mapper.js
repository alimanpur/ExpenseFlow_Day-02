/**
 * ExpenseFlow - Circle Document Mapper
 *
 * Canonical transformation from backend Circle document to frontend format.
 * This is the ONLY authorized mapping function for Circle documents.
 *
 * NEVER use memberBalances for member data.
 * NEVER reconstruct members from financial data.
 */

/**
 * Maps a backend circle document to frontend format.
 * Uses ONLY circle.members as the canonical member source.
 *
 * @param {Object} circleDoc - Backend circle document (from GET /circles/:id or GET /circles)
 * @param {string} currentUserId - Current user's ID for yourBalance calculation
 * @returns {Object|null} Mapped circle object or null if circleDoc is null/undefined
 */
export function mapCircleDocument(circleDoc, currentUserId) {
  if (!circleDoc) return null;

  const members = (circleDoc.members || []).map((m) => {
    const userObj = m.user || {};
    return {
      _id: m._id,
      id: m._id,
      user: userObj._id ? userObj : { _id: m.user, name: m.name, email: m.email },
      name: userObj.name || m.displayName || 'Unknown',
      email: userObj.email || '',
      avatar: userObj.avatar || null,
      role: m.role || 'member',
      status: m.status || 'registered',
      isGuest: m.isGuest || false,
      isActive: m.isActive !== false,
      joinedAt: m.joinedAt,
      displayName: m.displayName,
    };
  });

  const currentMember = members.find(m => m.user?._id === currentUserId);
  const yourBalance = currentMember?.netBalance || 0;

  return {
    id: circleDoc._id,
    name: circleDoc.name || '',
    description: circleDoc.description || '',
    category: circleDoc.category || 'circle',
    currency: circleDoc.currency || 'USD',
    totalSpent: circleDoc.totalSpent || 0,
    yourBalance: Math.round(yourBalance * 100) / 100,
    memberCount: members.length,
    expenseCount: circleDoc.expenseCount || 0,
    members,  // Complete members from circle.members
    owner: circleDoc.owner?._id || circleDoc.owner,
    isArchived: circleDoc.isArchived || false,
    isDeleted: circleDoc.isDeleted || false,
    lastActivity: circleDoc.lastActivity || new Date().toLocaleDateString(),
    recentExpenses: (circleDoc.recentExpenses || []).map((e) => ({
      id: e._id || e.id,
      _id: e._id || e.id,
      title: e.title || e.description,
      description: e.description,
      category: e.category,
      amount: e.amount,
      currency: e.currency || 'USD',
      date: e.date || e.createdAt,
      splitMethod: e.splitMethod,
      paidBy: e.paidBy || e.payer,
    })),
    settlements: (circleDoc.settlements || []).map((s) => ({
      id: s._id || s.id,
      _id: s._id || s.id,
      from: s.from,
      to: s.to,
      amount: s.amount,
      status: s.status,
      currency: s.currency || 'USD',
    })),
    activity: (circleDoc.activity || []).map((a) => ({
      id: a._id || a.id,
      _id: a._id || a.id,
      user: a.user,
      text: a.description || a.text || '',
      type: a.type || '',
      createdAt: a.createdAt,
    })),
  };
}
