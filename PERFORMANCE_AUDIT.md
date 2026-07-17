# ExpenseFlow Performance Audit Report

**Date:** 2026-07-17  
**Auditor:** Kilo  
**Scope:** Frontend + Backend performance review  
**Method:** Static code analysis of verified code paths only

---

## Executive Summary

ExpenseFlow has a solid architectural foundation: route-level code splitting, React Query for server state, and MongoDB aggregation pipelines for financial calculations. However, the audit identified **8 verified performance bottlenecks** and **12 optimization recommendations**. The most critical issues are N+1 query patterns in the FinancialEngine, excessive React re-renders from unstable hook return values, and an oversized main bundle.

---

## Verified Performance Issues

### PERF-1: N+1 Query Pattern in FinancialEngine.getCircleSummary
**Severity:** High  
**Category:** N+1 Queries  
**File:** `backend/src/services/financial.engine.js:258-276`

**Finding:**
```js
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

const pendingSettlements = (await Promise.all(
  settlements.filter(s => s.status === SETTLEMENT_STATUS.PENDING).map(withNames)
));
```

For each settlement with an unmapped party ID, `resolveSettlementName` executes a separate `Member.findById` query. A circle with 100 settlements can trigger up to 100 additional queries.

**Impact:** Linear query scaling with settlement count. A single `/financial/circles/:id/financial-summary` request can execute 100+ database round-trips.

**Proof:** `settlements.filter(...).map(withNames)` where `withNames` calls `resolveSettlementName` which calls `Member.findById` for any party not in `memberNameMap`.

---

### PERF-2: Unstable Hook Return Values Cause Cascading Re-renders
**Severity:** High  
**Category:** React Re-renders  
**File:** `frontend/src/services/financial.engine.js:239-594`

**Finding:**
```js
export function useFinancialEngine() {
  // ... multiple useQuery calls ...
  
  return {
    dashboard,
    people,
    profile,
    analytics,
    circles,
    useCircle,
    refreshAfterAction,
    invalidateAffectedQueries: (actionType, circleId) => invalidateAffectedQueries(queryClient, actionType, circleId),
    isLoading,
    isError,
    error,
    queryClient,
    currentUserId,
    currentMemberId,
    userCurrency,
    allSettlementSuggestions,
  };
}
```

A new object literal is created on every render. Any component calling `useFinancialEngine()` will re-render on every parent render, even when query data hasn't changed.

**Impact:** Every page using `useFinancialEngine` re-renders on every state change in the app.

**Proof:** No `useMemo` wrapping the return value. The object reference is new on each call.

---

### PERF-3: Socket Effect Re-registers 14 Handlers on Every Engine Change
**Severity:** Medium  
**Category:** React Re-renders / Socket Performance  
**File:** `frontend/src/components/layout/AppShell.jsx:75-163`

**Finding:**
```js
useEffect(() => {
  const handleSocketEvent = (eventName, data) => { /* ... */ };
  const events = [/* 14 events */];
  const handlers = {};
  events.forEach(event => {
    const handler = (data) => handleSocketEvent(event, data);
    socketService.on(event, handler);
    handlers[event] = handler;
  });
  return () => {
    Object.keys(handlers).forEach(event => {
      socketService.off(event, handlers[event]);
    });
  };
}, [engine]); // <-- engine object changes every render
```

The dependency array contains `engine`, which is a new object every render (see PERF-2). This causes 14 `socketService.on()` calls and 14 `socketService.off()` calls on every render cycle.

**Impact:** Unnecessary socket listener churn, memory pressure from handler allocation, and potential missed events during re-registration.

---

### PERF-4: Oversized Main Bundle
**Severity:** Medium  
**Category:** Bundle Size  
**Files:** `frontend/dist/assets/index-BWLRjg5e.js` (365 KB / 113 KB gzipped)

**Finding:**
The main shared bundle contains:
- React + React DOM
- React Router DOM
- TanStack React Query
- Lucide React icons (all icons bundled)
- All shared utilities

Notable lazy chunk sizes:
- `EntriesPage-DZ3UD3al.js`: 49.7 KB
- `auth-Bkfwh_Oy.js`: 46.2 KB
- `CircleDetail-Dwvs3hPI.js`: 38.5 KB
- `dist-ChQF6v7y.js`: 18.9 KB (financial engine)
- `mock-data-DlFQ1v7c.js`: 7.2 KB (dead code still bundled)

**Impact:** Slow initial page load, especially on 3G/slow networks. The 365 KB main bundle blocks first meaningful paint.

**Proof:** Build output from `npm run build` shows 365 KB main chunk plus large route chunks.

---

### PERF-5: Mock Data Still Bundled After Deletion
**Severity:** Medium  
**Category:** Bundle Size / Dead Code  
**File:** `frontend/dist/assets/mock-data-DlFQ1v7c.js` (7.2 KB)

**Finding:**
Despite removing `frontend/src/data/mock-data.js`, the build output still contains `mock-data-DlFQ1v7c.js`. This indicates either:
1. A cached build artifact, or
2. Another import path pulling in mock data

**Impact:** 7.2 KB of dead code shipped to production.

---

### PERF-6: Excessive React Query Invalidations on Mutation
**Severity:** Medium  
**Category:** React Query / Backend Response Times  
**File:** `frontend/src/services/financial.engine.js:48-140`

**Finding:**
```js
const AFFECTED_KEYS_MAP = {
  EXPENSE_CREATED: () => [
    QUERY_KEYS.DASHBOARD, QUERY_KEYS.EXPENSES_ME, QUERY_KEYS.CIRCLES,
    QUERY_KEYS.PEOPLE, QUERY_KEYS.PROFILE, QUERY_KEYS.NOTIFICATIONS,
    QUERY_KEYS.SETTLEMENTS, QUERY_KEYS.ARCHIVE,
    QUERY_KEYS.ANALYTICS('all'), QUERY_KEYS.ANALYTICS('3m'),
    QUERY_KEYS.ANALYTICS('6m'), QUERY_KEYS.ANALYTICS('1y'), ['activity'],
  ],
  // ... similar for EXPENSE_DELETED, EXPENSE_EDITED, etc.
};
```

A single expense creation invalidates 13+ query keys. With stale times of 2-30 minutes, this triggers 13+ parallel refetches, many of which hit the same backend endpoints.

**Impact:** "Waterfall" of HTTP requests after every mutation. User sees loading spinners across the app.

---

### PERF-7: Missing Compound Database Indexes
**Severity:** Medium  
**Category:** Database Indexes  
**Files:** `backend/src/models/Expense.js`, `backend/src/models/Settlement.js`, `backend/src/models/ExpenseSplit.js`

**Finding:**
Common query patterns lack compound indexes:

| Query Pattern | Existing Index | Missing Compound Index |
|---------------|---------------|----------------------|
| `{ circle, isDeleted, date }` (sorted by date) | `{circle: 1, date: -1}`, `{circle: 1, isDeleted: 1}` | `{circle: 1, isDeleted: 1, date: -1}` |
| `{ circle, status }` (settlements) | `{circle: 1, status: 1}` | Already exists |
| `ExpenseSplit.find({ expense: { $in: [...] } })` | `{expense: 1, user: 1}` | `{expense: 1}` (partial coverage) |

**Impact:** MongoDB performs collection scans for uncovered query patterns. `getCircleSummary` loads all expenses/splits for a circle; without `{circle: 1, isDeleted: 1, date: -1}`, MongoDB scans more documents than necessary.

---

### PERF-8: Socket Listener Memory Leak Risk
**Severity:** Low  
**Category:** Memory Leaks  
**File:** `frontend/src/services/socket.service.js:69-75`

**Finding:**
```js
on(event, callback) {
  if (!this.listeners.has(event)) {
    this.listeners.set(event, new Set());
  }
  this.listeners.get(event).add(callback);
  return () => this.off(event, callback);
}
```

The `listeners` Map grows unbounded if components call `socketService.on()` without cleanup. While `off()` exists, there's no mechanism to detect or warn about leaked listeners. The `SocketService` is a singleton (`export const socketService = new SocketService()`), so leaked listeners persist for the app's lifetime.

**Impact:** Memory growth proportional to component mount/unmount cycles without cleanup.

---

## Performance Strengths (Verified)

| Area | Status | Details |
|------|--------|---------|
| **Route Code Splitting** | PASS | All 27 routes use `React.lazy` + `Suspense` |
| **React Query Integration** | PASS | Centralized data fetching with cache invalidation |
| **Backend Aggregation** | PASS | Financial calculations done via MongoDB aggregation, not JS loops |
| **Parallel Queries** | PASS | `Promise.all` used for independent DB queries in `getUserCircles` |
| **Soft Delete Indexing** | PASS | `isDeleted` included in compound indexes where needed |
| **TTL Indexes** | PASS | Auto-expiring indexes on `Notification`, `ActivityLog`, `AuditLog` |
| **Graceful Shutdown** | PASS | SIGTERM/SIGINT handlers close HTTP server and DB connection |
| **Compression** | PASS | `compression()` middleware enabled in Express |
| **Rate Limiting** | PASS | Global + auth-specific rate limits |
| **Populate Selectivity** | PASS | `.select('name email avatar')` used to limit populated fields |

---

## Optimization Recommendations

### REC-1: Fix N+1 in FinancialEngine (Critical)
**Priority:** High  
**File:** `backend/src/services/financial.engine.js`

Batch settlement party name resolution using a single `$lookup` aggregation or pre-load all members into memory:

```js
// Pre-load ALL member names into a single Map before processing settlements
const allMemberNames = {};
const allMembers = await Member.find({ circle: circleObjectId, isDeleted: false })
  .select('_id displayName nickname user')
  .lean();
allMembers.forEach(m => {
  allMemberNames[m._id.toString()] = this.resolveMemberName(m);
  if (m.user) {
    const userId = m.user._id ? m.user._id.toString() : m.user.toString();
    allMemberNames[userId] = this.resolveMemberName(m);
  }
});

// Then in resolveSettlementName, use allMemberNames[id] instead of DB lookup
```

### REC-2: Memoize useFinancialEngine Return Value
**Priority:** High  
**File:** `frontend/src/services/financial.engine.js:576-594`

```js
export function useFinancialEngine() {
  // ... existing queries ...
  
  return useMemo(() => ({
    dashboard,
    people,
    profile,
    analytics,
    circles,
    useCircle,
    refreshAfterAction,
    invalidateAffectedQueries: (actionType, circleId) => 
      invalidateAffectedQueries(queryClient, actionType, circleId),
    isLoading,
    isError,
    error,
    queryClient,
    currentUserId,
    currentMemberId,
    userCurrency,
    allSettlementSuggestions,
  }), [
    dashboard, people, profile, analytics, circles,
    queryClient, currentUserId, currentMemberId, userCurrency,
    allSettlementSuggestions,
  ]);
}
```

### REC-3: Stabilize Socket Effect Dependencies
**Priority:** High  
**File:** `frontend/src/components/layout/AppShell.jsx:75`

Move socket registration outside the component or use a ref for `engine`:

```js
const engineRef = useRef(engine);
engineRef.current = engine;

useEffect(() => {
  const handleSocketEvent = (eventName, data) => {
    const currentEngine = engineRef.current;
    // ... use currentEngine.refreshAfterAction(...)
  };
  // ... register handlers ...
}, []); // Empty deps - register once
```

### REC-4: Add Compound Indexes
**Priority:** Medium  
**Files:** `backend/src/models/Expense.js`, `backend/src/models/ExpenseSplit.js`

```js
// Expense.js
expenseSchema.index({ circle: 1, isDeleted: 1, date: -1 });

// ExpenseSplit.js
expenseSplitSchema.index({ expense: 1 });
```

### REC-5: Reduce React Query Invalidation Scope
**Priority:** Medium  
**File:** `frontend/src/services/financial.engine.js:48-140`

Instead of invalidating 13 keys on every mutation, use targeted refetches or optimistic updates:

```js
// Instead of invalidating everything:
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });

// Use refetchQueries for critical paths only:
queryClient.refetchQueries({ queryKey: QUERY_KEYS.DASHBOARD });
queryClient.refetchQueries({ queryKey: QUERY_KEYS.CIRCLES });
// Leave analytics/profile cached; they'll update on next staleTime
```

### REC-6: Remove Dead Code from Bundle
**Priority:** Medium  
**Action:** Clean build cache and verify no mock-data imports remain

```bash
rm -rf frontend/dist node_modules/.vite frontend/node_modules/.vite
npm run build
```

Verify `mock-data` chunk is absent from build output.

### REC-7: Implement Route Preloading
**Priority:** Low  
**File:** `frontend/src/components/layout/AppShell.jsx`

Preload likely next routes on hover:

```js
import { prefetchQuery } from '@tanstack/react-query';

const handleLinkHover = (routeComponent) => {
  // Preload the lazy component
  routeComponent.preload();
};
```

### REC-8: Add Bundle Analysis
**Priority:** Low  
**Action:** Add `rollup-plugin-visualizer` to identify large dependencies

```bash
npm install -D rollup-plugin-visualizer
```

This will generate a treemap of bundle contents to identify optimization opportunities.

---

## Backend Query Analysis

### High-Frequency Endpoints

| Endpoint | Queries | Potential Optimization |
|----------|---------|----------------------|
| `GET /financial/circles/:id/financial-summary` | 5-100+ (N+1 in name resolution) | Batch member name lookup (REC-1) |
| `GET /circles` | 3 (members, circles, allCircleMembers) | Already optimized with `Promise.all` |
| `GET /expenses/:id` | 3-4 (expense, member, circle members, populate) | Acceptable for detail view |
| `POST /expenses` | 4-6 (circle, member, payer, splits, transaction) | Acceptable for write operation |
| `GET /settlements` | 3-4 (member, circle, settlements, populate) | Acceptable |

---

## Socket Performance Analysis

### Current Behavior
- 14 event types registered in `AppShell.jsx`
- Every mutation invalidates 10+ React Query keys
- No event batching or debouncing
- Backend broadcasts to entire circle rooms

### Recommendations
1. **Batch invalidations:** Debounce `refreshAfterAction` calls within 100ms window
2. **Selective invalidation:** Only invalidate keys relevant to the changed resource
3. **Event deduplication:** Ignore duplicate events within 1 second
4. **Targeted emits:** Consider user-specific rooms for notifications instead of circle-wide broadcasts

---

## Database Query Count Estimates

| Operation | Current Queries | Optimized Queries |
|-----------|----------------|------------------|
| `getCircleSummary` (50 settlements) | 5 + 50 = 55 | 5 |
| `getUserCircles` (10 circles) | 3 | 3 |
| `getExpense` (detail) | 4 | 4 |
| `createExpense` | 6 | 6 |
| `getSettlements` (page 20) | 3 | 3 |

---

## Conclusion

ExpenseFlow's biggest performance risk is the N+1 query pattern in `FinancialEngine.getCircleSummary`, which can execute 100+ database queries for a single request. The frontend's unstable hook return values and socket effect dependencies cause unnecessary re-renders. The main bundle at 365 KB is acceptable but could be reduced with vendor splitting and dead-code elimination.

**Recommended action items by priority:**
1. Fix N+1 in `FinancialEngine.getCircleSummary` (REC-1)
2. Memoize `useFinancialEngine` return value (REC-2)
3. Stabilize socket effect dependencies (REC-3)
4. Add compound indexes on `Expense` and `ExpenseSplit` (REC-4)
5. Reduce React Query invalidation scope (REC-5)
6. Clean build cache and remove dead code (REC-6)
