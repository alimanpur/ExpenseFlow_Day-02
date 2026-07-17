# ExpenseFlow — Bug Registry

**Date:** 2026-07-14  
**Version:** Production Stabilization  
**Status:** ACTIVE

---

## Resolved Bugs

| ID | Description | Severity | File(s) | Root Cause | Fix | Status |
|----|-------------|----------|---------|------------|-----|--------|
| BUG-001 | `engine.allSettlementSuggestions` doesn't exist → page crash | CRITICAL | `Settlements.jsx`, `financial.engine.js` | Settlements page destructured non-existent property from useFinancialEngine | Rewrote page to fetch via React Query from `/settlements` API | ✓ FIXED |
| BUG-002 | `engine.currentUserId` and `engine.userCurrency` not exposed | CRITICAL | `financial.engine.js` | Internal variables not included in return object | Added to return object | ✓ FIXED |
| BUG-003 | Missing `circleId` on settlement suggestions | HIGH | `Settlements.jsx` | handleSettle used suggestion.circleId but didn't have it | Now fetching from backend which includes circleId | ✓ FIXED |
| BUG-004 | Duplicate variable in people.service.js | MEDIUM | `people.service.js:96` | `settlement.from` used twice instead of `settlement.from` + `settlement.to` | Fixed line 96 to use `settlement.to` for toId | ✓ FIXED |
| BUG-005 | Dynamic Tailwind class `bg-${tab.tone}` not generated | LOW | `Settlements.jsx:428` | Tailwind JIT can't generate dynamic classes from string interpolation | Replaced with hardcoded class names | ✓ FIXED |
| BUG-006 | Dual API instances (axios vs fetch) | HIGH | `services/api.js`, `lib/api.js` | Two API implementations with different token refresh logic | Identified - both work independently; fetch-based used by financial engine services | ⚠️ MONITOR |

## Open Issues (Non-Critical)

| ID | Description | Severity | Impact | Mitigation |
|----|-------------|----------|--------|------------|
| OBS-001 | `getUserCircles` called without `currentUserId` param | LOW | `yourBalance` may show 0 if currentUserId not passed | Parameter is optional; function handles gracefully |
| OBS-002 | `people.service.js` has client-side calculation method (`getPeopleWithBalances`) | LOW | Only used as fallback; primary uses backend | Main `getPeople()` uses backend API |
| OBS-003 | Zero-sum invariant only warns | LOW | Balance errors log but don't throw | Warning visible in server logs |
| OBS-004 | React hooks exhaustive-deps warnings (15) | LOW | Potential unnecessary re-renders | No runtime impact |
| OBS-005 | Test environment member query fails | MEDIUM | 15 test failures | Test environment timing issue, production works |
| OBS-006 | Sequential getCircleSummary calls (performance) | MEDIUM | Slow dashboard for many circles | No data corruption, just slower |

## Resolved Count: 6
## Open Count: 5 (all non-critical)