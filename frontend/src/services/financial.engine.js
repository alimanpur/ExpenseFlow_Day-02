/**
 * ExpenseFlow - Financial Engine (Frontend Data Layer)
 *
 * Architecture:
 *   React Query → Backend FinancialEngine API → UI
 *
 * Every financial value in the system flows from the backend.
 * This module provides hooks and helpers to fetch data.
 * NO financial calculations are performed on the frontend.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getCircleFinancialSummary,
  getDashboard,
  getPeopleSummary,
  getLedger,
  getAnalyticsSummary,
  getProfileStats,
  getAllSettlementsAggregated,
} from "./financial.engine.api";
import { getCircle, getUserCircles } from "./circle.service";

// ─── Query key constants ──────────────────────────────────────
export const QUERY_KEYS = {
  DASHBOARD: ['dashboard'],
  EXPENSES: ['expenses'],
  EXPENSES_ME: ['expenses', 'me'],
  EXPENSES_CIRCLE: (id) => ['expenses', 'circle', id],
  CIRCLES: ['circles'],
  CIRCLE: (id) => ['circle', id],
  CIRCLE_MEMBERS: (id) => ['circle', id, 'members'],
  SETTLEMENTS: ['settlements'],
  SETTLEMENTS_SUGGESTED: (id) => ['settlements', 'suggested', id],
  PEOPLE: ['people'],
  ANALYTICS: (period) => ['analytics', period],
  PROFILE: ['profileStats'],
  NOTIFICATIONS: ['notifications'],
  NOTIFICATION_UNREAD: ['notifications', 'unread'],
  ARCHIVE: ['archive'],
  ACTIVITY: ['activity'],
  SEARCH: (q) => ['search', q],
};

// ─── Action → affected keys mapping ───────────────────────────
const AFFECTED_KEYS_MAP = {
  EXPENSE_CREATED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.EXPENSES_ME, QUERY_KEYS.CIRCLES,
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.ARCHIVE,
    QUERY_KEYS.ANALYTICS('all'), QUERY_KEYS.ANALYTICS('3m'),
    QUERY_KEYS.ANALYTICS('6m'), QUERY_KEYS.ANALYTICS('1y'), ['activity'],
  ],
  EXPENSE_DELETED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.EXPENSES_ME, QUERY_KEYS.CIRCLES,
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.ARCHIVE,
    QUERY_KEYS.ANALYTICS('all'), QUERY_KEYS.ANALYTICS('3m'),
    QUERY_KEYS.ANALYTICS('6m'), QUERY_KEYS.ANALYTICS('1y'), ['activity'],
  ],
  EXPENSE_EDITED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.EXPENSES_ME, QUERY_KEYS.CIRCLES,
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.ARCHIVE,
    QUERY_KEYS.ANALYTICS('all'), QUERY_KEYS.ANALYTICS('3m'),
    QUERY_KEYS.ANALYTICS('6m'), QUERY_KEYS.ANALYTICS('1y'), ['activity'],
  ],
  EXPENSE_DUPLICATED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.EXPENSES_ME, QUERY_KEYS.CIRCLES,
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, QUERY_KEYS.SETTLEMENTS,
    QUERY_KEYS.ARCHIVE, QUERY_KEYS.ANALYTICS('all'), ['activity'],
  ],
  CIRCLE_CREATED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS, QUERY_KEYS.ANALYTICS('all'), ['activity'],
  ],
  CIRCLE_UPDATED: (id) => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id),
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, ['activity'],
  ],
  CIRCLE_ARCHIVED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, ['activity'],
  ],
  CIRCLE_DELETED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.PROFILE, QUERY_KEYS.EXPENSES_ME, ['activity'],
  ],
  MEMBER_ADDED: (id) => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id),
    QUERY_KEYS.CIRCLE_MEMBERS(id), QUERY_KEYS.PEOPLE, QUERY_KEYS.NOTIFICATIONS, ['activity'],
  ],
  MEMBER_JOINED: (id) => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id),
    QUERY_KEYS.CIRCLE_MEMBERS(id), QUERY_KEYS.PEOPLE, QUERY_KEYS.NOTIFICATIONS, ['activity'],
  ],
  MEMBER_LEFT: (id) => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id),
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, ['activity'],
  ],
  MEMBER_REMOVED: (id) => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id),
    QUERY_KEYS.CIRCLE_MEMBERS(id), QUERY_KEYS.PEOPLE, ['activity'],
  ],
  MEMBER_ROLE_UPDATED: (id) => [
    QUERY_KEYS.CIRCLES, QUERY_KEYS.CIRCLE(id), QUERY_KEYS.CIRCLE_MEMBERS(id), ['activity'],
  ],
  SETTLEMENT_SUGGESTED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, ['activity'],
  ],
  SETTLEMENT_CONFIRMED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.ANALYTICS('all'), ['activity'],
  ],
  SETTLEMENT_COMPLETED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.ANALYTICS('all'), ['activity'],
  ],
  SETTLEMENT_CANCELLED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, ['activity'],
  ],
  NOTIFICATION_READ: () => [QUERY_KEYS.NOTIFICATIONS, QUERY_KEYS.NOTIFICATION_UNREAD],
  CURRENCY_CHANGED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.PROFILE, QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.ARCHIVE, QUERY_KEYS.ANALYTICS('all'),
  ],
  PROFILE_UPDATED: () => [QUERY_KEYS.PROFILE, QUERY_KEYS.PEOPLE, QUERY_KEYS.CIRCLES, ['activity']],
  SETTLEMENT_PAID: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.ANALYTICS('all'), ['activity'],
  ],
  SETTLEMENT_PAYMENT_RECORDED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.CIRCLES, QUERY_KEYS.PEOPLE,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS, ['activity'],
  ],
};

export function invalidateAffectedQueries(queryClient, actionType, circleId) {
  const keyBuilder = AFFECTED_KEYS_MAP[actionType];
  if (!keyBuilder) { console.warn(`[FinancialEngine] Unknown action type: ${actionType}`); return; }
  const keys = keyBuilder(circleId);
  keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  if (circleId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CIRCLE(circleId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES_CIRCLE(circleId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTLEMENTS_SUGGESTED(circleId) });
  }
}

// ─── Backward-compatible calculation functions (now call backend) ─────────────────

export function calculateCircleFinances({ circle, expenses, settlements, currentUserId }) {
  // DEPRECATED: This now returns empty structure - use useFinancialEngine().useCircle(circleId) instead
  console.warn('[FinancialEngine] calculateCircleFinances is deprecated. Use useCircle hook from useFinancialEngine.');
  return {
    memberPositions: [],
    standings: [],
    members: [],
    memberLedgers: {},
    debtMatrix: { matrix: {}, relationships: [] },
    relationships: [],
    suggestions: [],
    pending: [],
    completed: [],
    cancelled: [],
    hasOutstanding: false,
    totalOutstanding: 0,
    yourBalance: 0,
    yourReceivable: 0,
    yourPayable: 0,
    totalSpent: 0,
    expenseCount: 0,
    memberCount: 0,
    categories: [],
    lastActivity: null,
    topCategory: null,
    biggestSpender: null,
    largestExpense: null,
    monthlyTrend: [],
    recentExpenses: [],
  };
}

export function calculateDashboard({ circles, expenses, settlements, currentUserId, circleFinancesMap }) {
  // DEPRECATED: Use dashboard from useFinancialEngine() instead
  console.warn('[FinancialEngine] calculateDashboard is deprecated. Use dashboard from useFinancialEngine.');
  return {
    netBalance: 0,
    owedToYou: 0,
    youOwe: 0,
    totalPaid: 0,
    totalSettlements: 0,
    monthlySpending: 0,
    pendingSettlements: 0,
    openExpenses: 0,
    completedSettlements: 0,
    topCategories: [],
    largestExpense: null,
    totalOutstandingDebt: 0,
    circleCount: 0,
    expenseCount: 0,
    settlementCount: 0,
  };
}

export function calculateAnalytics({ expenses, settlements, circles, currentUserId }) {
  // DEPRECATED: Use analytics from useFinancialEngine() instead
  console.warn('[FinancialEngine] calculateAnalytics is deprecated. Use analytics from useFinancialEngine.');
  return {
    total: 0, thisMonth: 0, average: 0, avgPerExpense: 0, momChange: 0,
    topExpenses: [], topCategory: { category: 'None', value: 0, pct: 0 },
    circles: [], monthlyTrend: [], weeklyTrend: [], yearlyTrend: [],
    categoryBreakdown: [], circleBreakdown: [], memberBreakdown: [],
    largestExpense: null, averageExpense: 0, mostActiveCircle: null,
    mostActiveMember: null, paymentFrequency: 0, settlementTrend: [],
    debtTrend: [], expenseCount: 0, settlementCount: 0, circleCount: 0,
  };
}

export function calculateProfile({ expenses, settlements, circles, currentUserId }) {
  // DEPRECATED: Use profile from useFinancialEngine() instead
  console.warn('[FinancialEngine] calculateProfile is deprecated. Use profile from useFinancialEngine.');
  return {
    lifetimePaid: 0, lifetimeReceived: 0, lifetimeGiven: 0, averageExpense: 0,
    largestExpense: null, expensesThisMonth: 0, thisMonthSpent: 0,
    settlementsCompleted: 0, expenseCount: 0, mostActiveCircle: null,
    recentActivity: [],
  };
}

// ══════════════════════════════════════════════════════════════════
// SECTION 1: REACT QUERY HOOK — THE SINGLE HOOK ALL PAGES USE
// ══════════════════════════════════════════════════════════════════

export function useFinancialEngine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id || user?._id;
  const userCurrency = user?.preferences?.currency || 'USD';

  // ─── Backend-driven queries ──
  const dashboardQuery = useQuery({ queryKey: QUERY_KEYS.DASHBOARD, queryFn: getDashboard, staleTime: 30 * 1000 });
  const circlesQuery = useQuery({
    queryKey: QUERY_KEYS.CIRCLES,
    queryFn: () => getUserCircles(currentUserId),
    staleTime: 2 * 60 * 1000,
  });
  const peopleQuery = useQuery({ queryKey: QUERY_KEYS.PEOPLE, queryFn: getPeopleSummary, staleTime: 2 * 60 * 1000 });
  const profileQuery = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: getProfileStats, staleTime: 2 * 60 * 1000 });
  const analyticsQuery = useQuery({ queryKey: QUERY_KEYS.ANALYTICS('all'), queryFn: () => getAnalyticsSummary('all'), staleTime: 2 * 60 * 1000 });
  const settlementsQuery = useQuery({ queryKey: QUERY_KEYS.SETTLEMENTS, queryFn: getAllSettlementsAggregated, staleTime: 2 * 60 * 1000 });

  // Raw data from backend
  const dashboard = dashboardQuery.data || {};
  const people = peopleQuery.data || [];
  const profile = profileQuery.data || {};
  const analytics = analyticsQuery.data || {};
  const circles = useMemo(() => (circlesQuery.data?.circles || []), [circlesQuery.data]);
  const allSettlements = settlementsQuery.data || [];

  const currentMemberId = useMemo(() => {
    if (!currentUserId || !circles) return null;
    for (const c of circles) {
      const me = c.members?.find(m => m.user?._id === currentUserId);
      if (me) return me._id || me.id;
    }
    return null;
  }, [currentUserId, circles]);

  function useCircle(circleId) {
    // Fetch the full circle document (members, activity, owner, etc.)
    const circleDocQuery = useQuery({
      queryKey: [...QUERY_KEYS.CIRCLE(circleId), 'document'],
      queryFn: () => getCircle(circleId),
      enabled: !!circleId,
    });

    // Fetch the financial summary (balances, settlements, stats, etc.)
    const financialQuery = useQuery({
      queryKey: QUERY_KEYS.CIRCLE(circleId),
      queryFn: () => getCircleFinancialSummary(circleId),
      enabled: !!circleId,
    });

    const circleDoc = circleDocQuery.data || null;
    const financialData = financialQuery.data || null;

    const isLoading = circleDocQuery.isLoading || financialQuery.isLoading;
    const isError = circleDocQuery.isError || financialQuery.isError;
    const error = circleDocQuery.error || financialQuery.error;

    // Build `circle` — the full circle document with members and activity
    // ✅ Members come ONLY from circleDoc.members (canonical source)
    const circle = useMemo(() => {
      if (!circleDoc) return null;
      // Map members from the circle document (canonical source)
      const members = (circleDoc.members || []).map(m => {
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
      return {
        _id: circleDoc._id,
        id: circleDoc._id,
        name: circleDoc.name || '',
        description: circleDoc.description || '',
        category: circleDoc.category || 'circle',
        currency: circleDoc.currency || 'USD',
        owner: circleDoc.owner?._id || circleDoc.owner,
        members,  // ✅ Complete members from circle document
        activity: (circleDoc.activity || []).map(a => ({
          ...a,
          _id: a._id,
          id: a._id,
          user: a.user || {},
          text: a.description || a.text || '',
          type: a.type || '',
          createdAt: a.createdAt,
        })),
        recentExpenses: (circleDoc.recentExpenses || []).map(e => ({
          ...e,
          _id: e._id,
          id: e._id,
          paidBy: e.paidBy || e.payer || {},
        })),
        isArchived: circleDoc.isArchived || false,
        isDeleted: circleDoc.isDeleted || false,
      };
    }, [circleDoc]);

    // Build `circleData` — financial summary data + computed fields
    // ✅ Uses ONLY financial data for financial metrics
    // ✅ Joins with circle.members for member names (not memberBalances)
    const circleData = useMemo(() => {
      if (!financialData) return null;
      const memberBalances = financialData.memberBalances || [];

      const currentMemberId = circle?.members && currentUserId
        ? circle.members.find(m => m.user?._id === currentUserId)?._id || circle.members.find(m => m.user?._id === currentUserId)?.id
        : null;

      const myBalance = memberBalances.find(b => b.userId === currentMemberId);
      
      const memberNameMap = {};
      const memberUserMap = {};
      if (circle?.members) {
        circle.members.forEach(m => {
          const mid = m._id || m.id;
          if (mid) {
            memberNameMap[mid] = m.name;
            if (m.user?._id) memberUserMap[mid] = m.user._id;
          }
        });
      }
      
      const standings = memberBalances.map(b => {
        const mid = b.userId;
        const name = memberNameMap[mid] || b.name || 'Unknown';
        const userId = memberUserMap[mid] || mid;
        return {
          member: { 
            user: { _id: userId }, 
            name: name
          },
          balance: b.netBalance,
          paid: b.totalPaid,
          owed: b.totalOwed,
          count: 0,
        };
      });
      
      return {
        yourBalance: myBalance?.netBalance || 0,
        memberCount: financialData.memberCount || 0,
        expenseCount: financialData.expenseCount || 0,
        totalSpent: financialData.totalSpent || 0,
        lastActivity: financialData.largestExpense?.date || null,
        standings,
        categories: (financialData.categoryTotals || []).map(c => ({
          category: c.category,
          amount: c.amount,
        })),
        recentExpenses: financialData.largestExpense ? [{
          _id: financialData.largestExpense._id,
          id: financialData.largestExpense._id,
          title: financialData.largestExpense.title || financialData.largestExpense.description,
          description: financialData.largestExpense.description,
          amount: financialData.largestExpense.amount,
          category: financialData.largestExpense.category,
          date: financialData.largestExpense.date || financialData.largestExpense.createdAt,
          splitMethod: financialData.largestExpense.splitMethod,
          paidBy: financialData.largestExpense.paidBy || financialData.largestExpense.payer || {},
        }] : [],
      };
    }, [financialData, circle]);

    // Build `settlementPlan` from financial data
    const settlementPlan = useMemo(() => {
      if (!financialData) return { suggestions: [], pending: [], completed: [], cancelled: [], totalOutstanding: 0 };
      const mapSettlement = (s) => ({
        _id: s._id,
        id: s._id,
        from: s.from || { _id: s.fromId, name: s.fromName },
        to: s.to || { _id: s.toId, name: s.toName },
        fromId: s.fromId,
        toId: s.toId,
        fromName: s.fromName,
        toName: s.toName,
        amount: s.amount,
        currency: circleDoc?.currency || userCurrency,
        status: s.status,
        paymentMethod: s.paymentMethod || 'other',
        remainingAmount: s.remainingAmount || s.amount,
        createdAt: s.createdAt,
      });
      return {
        suggestions: (financialData.settlementSuggestions || []).map(s => ({
          id: `${s.fromId}-${s.toId}`,
          from: { id: s.fromId, name: s.fromName },
          to: { id: s.toId, name: s.toName },
          amount: s.amount,
          currency: circleDoc?.currency || userCurrency,
        })),
        pending: (financialData.pendingSettlements || []).map(mapSettlement),
        completed: (financialData.completedSettlements || []).map(mapSettlement),
        cancelled: (financialData.cancelledSettlements || []).map(mapSettlement),
        totalOutstanding: financialData.totalOutstanding || 0,
      };
    }, [financialData, circleDoc]);

    // Build `circleRelationships` from debt matrix
    const circleRelationships = useMemo(() => {
      if (!financialData?.debtMatrix?.relationships) return [];
      return financialData.debtMatrix.relationships.map(r => ({
        fromId: r.fromId,
        toId: r.toId,
        fromName: r.fromName,
        toName: r.toName,
        amount: r.amount,
        currency: circleDoc?.currency || userCurrency,
      }));
    }, [financialData, circleDoc]);

    // Build `memberProfiles` from memberBalances joined with circle.members
    // ✅ Uses circle.members for member identity, memberBalances for financials only
    const memberProfiles = useMemo(() => {
      if (!financialData?.memberBalances) return [];
      
      const memberNameMap = {};
      const memberIdMap = {};
      const memberUserMap = {};
      if (circle?.members) {
        circle.members.forEach(m => {
          const mid = m._id || m.id;
          if (mid) {
            memberNameMap[mid] = m.name;
            memberIdMap[mid] = mid;
            if (m.user?._id) memberUserMap[mid] = m.user._id;
          }
        });
      }
      
      return financialData.memberBalances.map(b => {
        const memberId = memberIdMap[b.userId] || b.userId;
        const memberName = memberNameMap[b.userId] || b.name || 'Unknown';
        const userId = memberUserMap[b.userId] || b.userId;
        return {
          member: { 
            user: { _id: userId }, 
            _id: memberId,
            name: memberName  // ✅ Use canonical name from circle.members
          },
          profile: {
            balance: b.netBalance,
            paid: b.totalPaid,
            owed: b.totalOwed,
            settlements: 0,
            pendingSettlements: 0,
            completedSettlements: 0,
            totalPaid: b.totalPaid,
            totalShare: b.totalOwed,
            amountToReceive: Math.max(0, b.netBalance),
            amountToPay: Math.max(0, -b.netBalance),
            status: b.netBalance >= 0 ? 'ahead' : 'behind',
            expenseCount: 0,
            averageExpense: 0,
            biggestExpense: null,
            lastExpense: null,
            lastSettlement: null,
          },
        };
      });
    }, [financialData, circle]);

    // Build `circleStatistics` from financial data
    const circleStatistics = useMemo(() => {
      if (!financialData) return { monthlyTrend: [], largestExpense: null, topCategory: null, biggestSpender: null };
      return {
        monthlyTrend: (financialData.monthlyTrend || []).map(m => ({
          month: m.month,
          value: m.value,
        })),
        largestExpense: financialData.largestExpense ? {
          _id: financialData.largestExpense._id,
          amount: financialData.largestExpense.amount,
          title: financialData.largestExpense.title || financialData.largestExpense.description,
          category: financialData.largestExpense.category,
          date: financialData.largestExpense.date,
        } : null,
        topCategory: financialData.topCategory ? {
          name: financialData.topCategory.category,
          amount: financialData.topCategory.amount,
        } : null,
        biggestSpender: financialData.biggestSpender ? {
          name: financialData.biggestSpender.name,
          amount: financialData.biggestSpender.amount,
        } : null,
      };
    }, [financialData]);

    const refetch = useMemo(() => () => {
      circleDocQuery.refetch();
      financialQuery.refetch();
    }, [circleDocQuery, financialQuery]);

    return {
      circle,
      circleData,
      settlementPlan,
      circleRelationships,
      memberProfiles,
      circleStatistics,
      isLoading,
      isError,
      error,
      refetch,
    };
  }

  function refreshAfterAction(actionType, circleId) {
    invalidateAffectedQueries(queryClient, actionType, circleId);
  }

  // Aggregate settlement data across all circles
  const allSettlementSuggestions = useMemo(() => {
    if (!circles || circles.length === 0) return { suggestions: [], pending: [], completed: [], cancelled: [] };
    const suggestions = [];
    const pending = [];
    const completed = [];
    const cancelled = [];
    circles.forEach(circle => {
      if (circle.settlementSuggestions) suggestions.push(...circle.settlementSuggestions.map(s => ({ ...s, circleId: circle.id, circleName: circle.name, currency: circle.currency || userCurrency })));
      if (circle.pendingSettlements) pending.push(...circle.pendingSettlements.map(s => ({ ...s, circleId: circle.id, circleName: circle.name, currency: circle.currency || userCurrency })));
      if (circle.completedSettlements) completed.push(...circle.completedSettlements.map(s => ({ ...s, circleId: circle.id, circleName: circle.name, currency: circle.currency || userCurrency })));
      if (circle.cancelledSettlements) cancelled.push(...circle.cancelledSettlements.map(s => ({ ...s, circleId: circle.id, circleName: circle.name, currency: circle.currency || userCurrency })));
    });
    return { suggestions, pending, completed, cancelled };
  }, [circles, userCurrency]);

  return {
    dashboard,
    people,
    profile,
    analytics,
    circles,
    useCircle,
    refreshAfterAction,
    invalidateAffectedQueries: (actionType, circleId) => invalidateAffectedQueries(queryClient, actionType, circleId),
    isLoading: dashboardQuery.isLoading || circlesQuery.isLoading || peopleQuery.isLoading || profileQuery.isLoading,
    isError: dashboardQuery.isError || circlesQuery.isError || peopleQuery.isError || profileQuery.isError,
    error: dashboardQuery.error || circlesQuery.error || peopleQuery.error || profileQuery.error,
    queryClient,
    currentUserId,
    currentMemberId,
    userCurrency,
    allSettlementSuggestions,
  };
}

export function syncAfterMutation(queryClient, actionType, circleId) {
  invalidateAffectedQueries(queryClient, actionType, circleId);
}