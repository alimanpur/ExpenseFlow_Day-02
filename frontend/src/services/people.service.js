import { api } from '../lib/api';
import { getUserCircles, getPeople as getAggregatedPeople } from './circle.service';
import { getUserExpenses } from './expense.service';
import { getAllSettlements, getSuggestedSettlements } from './settlement.service';

// Map backend user to person format
function mapUserToPerson(user) {
  return {
    id: user._id || user.id,
    name: user.name || 'Unknown',
    handle: user.handle || user.email?.split('@')[0] || '',
    email: user.email || '',
    avatar: user.avatar || null,
    initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??',
    hue: user.hue || Math.floor(Math.random() * 360),
  };
}

// Get all people with their balances
// DEPRECATED: Use getPeople() or FinancialEngine().people instead.
// This function performs client-side calculations which violate the spec.
export async function getPeopleWithBalances() {
  console.warn('[people.service] getPeopleWithBalances is deprecated. Use FinancialEngine().people or getPeople() from this module instead.');
  // ...existing implementation preserved for backward compatibility...
  const { circles } = await getUserCircles();
  const expenses = await getUserExpenses();
  const settlements = await getAllSettlements();
  const peopleMap = new Map();
  const circleMap = new Map();
  for (const circle of circles) {
    circleMap.set(circle.id, circle);
    const balances = await getSuggestedSettlements(circle.id).catch(() => ({}));
    for (const balance of balances.balances || []) {
      const userId = balance.user?._id || balance.user || balance.userId;
      if (!userId) continue;
      if (!peopleMap.has(userId)) {
        peopleMap.set(userId, {
          id: userId,
          name: balance.user?.name || 'Unknown',
          handle: balance.user?.email?.split('@')[0] || '',
          email: balance.user?.email || '',
          avatar: balance.user?.avatar || null,
          netBalance: 0,
          totalShared: 0,
          sharedCircles: [],
          recentExpenses: [],
          lastSettlement: null,
        });
      }
      const person = peopleMap.get(userId);
      person.netBalance += balance.netBalance || 0;
      person.totalShared += (balance.totalPaid || 0) + (balance.totalOwed || 0);
      person.sharedCircles.push(circle);
    }
  }
  for (const expense of expenses) {
    const participants = expense.participants || [];
    for (const p of participants) {
      const memberId = p.memberId || p.user || p.userId;
      if (!memberId) continue;
      if (!peopleMap.has(memberId)) {
        peopleMap.set(memberId, {
          id: memberId,
          name: p.name || 'Unknown',
          handle: p.handle || '',
          email: p.email || '',
          avatar: p.avatar || null,
          netBalance: 0,
          totalShared: 0,
          sharedCircles: [],
          recentExpenses: [],
          lastSettlement: null,
        });
      }
      const person = peopleMap.get(memberId);
      person.recentExpenses.push(expense);
    }
  }
  for (const settlement of settlements) {
    const fromId = settlement.from?._id || settlement.from;
    const toId = settlement.to?._id || settlement.to;
    if (fromId && !peopleMap.has(fromId)) {
      peopleMap.set(fromId, {
        id: fromId,
        name: settlement.from?.name || 'Unknown',
        handle: settlement.from?.email?.split('@')[0] || '',
        email: settlement.from?.email || '',
        avatar: settlement.from?.avatar || null,
        netBalance: 0,
        totalShared: 0,
        sharedCircles: [],
        recentExpenses: [],
        lastSettlement: settlement,
      });
    }
    if (toId && !peopleMap.has(toId)) {
      peopleMap.set(toId, {
        id: toId,
        name: settlement.to?.name || 'Unknown',
        handle: settlement.to?.email?.split('@')[0] || '',
        email: settlement.to?.email || '',
        avatar: settlement.to?.avatar || null,
        netBalance: 0,
        totalShared: 0,
        sharedCircles: [],
        recentExpenses: [],
        lastSettlement: settlement,
      });
    }
    if (fromId) {
      const person = peopleMap.get(fromId);
      if (person && (!person.lastSettlement || new Date(settlement.date) > new Date(person.lastSettlement.date || 0))) {
        person.lastSettlement = settlement;
      }
    }
    if (toId) {
      const person = peopleMap.get(toId);
      if (person && (!person.lastSettlement || new Date(settlement.date) > new Date(person.lastSettlement.date || 0))) {
        person.lastSettlement = settlement;
      }
    }
  }
  return Array.from(peopleMap.values());
}

// Get person details by ID
export async function getPersonDetails(personId) {
  const people = await getPeopleWithBalances();
  return people.find(p => p.id === personId) || null;
}

// Get all people (simplified version) — backed by the aggregated /circles/people
// endpoint so every field (paid, share, balance, member type, role) is real.
export async function getAllPeople() {
  const people = await getAggregatedPeople();
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.email?.split('@')[0] || '',
    email: p.email || '',
    avatar: p.avatar || null,
    isGuest: p.isGuest || false,
    status: p.status || (p.isGuest ? 'guest' : 'registered'),
    role: p.role || 'member',
    isOwner: p.role === 'owner',
    netBalance: p.currentBalance || 0,
    paid: p.paid || 0,
    share: p.share || 0,
    amountOwed: p.amountOwed || 0,
    amountToReceive: p.amountToReceive || 0,
    currentBalance: p.currentBalance || 0,
    circleCount: p.circleCount || (p.circles?.length || 0),
    totalShared: (p.paid || 0) + (p.share || 0),
    sharedCircles: (p.circles || []).map((c) => ({ id: c.id, name: c.name })),
    lastActivity: p.lastActivity || null,
    circles: p.circles || [],
    invitedBy: p.invitedBy || null,
  }));
}

// Top-level query used by the People page: returns everyone in the user's
// circles plus an aggregate net-balance summary.
export async function getPeople() {
  const people = await getAllPeople();
  const owedToYou = people
    .filter((p) => (p.currentBalance || 0) > 0)
    .reduce((sum, p) => sum + p.currentBalance, 0);
  const youOwe = people
    .filter((p) => (p.currentBalance || 0) < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);

  return {
    people,
    netBalance: {
      net: owedToYou - youOwe,
      owedToYou,
      youOwe,
    },
  };
}