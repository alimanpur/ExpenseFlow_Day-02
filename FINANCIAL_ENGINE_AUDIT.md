# ExpenseFlow Financial Engine Audit

**Date:** 2026-07-17  
**Auditor:** Kilo  
**Scope:** Complete backend financial pipeline  
**Method:** Static code tracing of verified paths

---

## Executive Summary

The Financial Engine is the single source of truth for all monetary calculations. The audit verified 12 critical code paths and identified **6 verified bugs/inconsistencies** and **4 design risks**. The most severe issue is that `updateExpense` does not recalculate splits when the amount changes, breaking the fundamental accounting invariant that `Σ splits = expense.amount`. A secondary zero-sum vulnerability exists when splits reference non-circle members.

---

## Verified Findings

### FIN-1: Expense Update Does Not Recalculate Splits
**Severity:** High  
**Category:** Expense Updates  
**File:** `backend/src/services/expense.service.js:317-370`

**Finding:**
```js
async updateExpense(expenseId, userId, data) {
  // ...
  const allowedFields = ['title', 'description', 'amount', 'category', 'date', 'notes', 'tags'];
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) expense[field] = data[field];
  });
  await expense.save();
  // ... NO split recalculation
}
```

When a user updates `amount` on an expense, the ExpenseSplit documents are NOT recalculated. The sum of split amounts no longer equals the expense amount. `getCircleSummary` then computes `totalOwed` from splits and `totalPaid` from expenses, producing a net balance that does not reflect reality.

**Impact:** Accounting invariant `Σ splits = expense.amount` is broken after any amount edit.

**Proof:** Traced `updateExpense` → `allowedFields.forEach` → `expense.save()`. No call to `splitEngine.calculate()` or `ExpenseSplit.updateMany()`.

---

### FIN-2: Zero-Sum Invariant Violation via Cross-Circle Splits
**Severity:** Medium  
**Category:** Zero Sum / Identity Resolution  
**File:** `backend/src/services/expense.service.js:48-103`, `backend/src/services/financial.engine.js:195-201`

**Finding:**
`createExpense` validates that the payer is a circle member, but does NOT validate that split users are circle members. In `getCircleSummary`:
```js
splits.forEach(s => {
  const userId = s.user.toString();
  const balanceKey = idToBalanceKey[userId];
  if (balanceKey && balanceMap[balanceKey]) {
    balanceMap[balanceKey].totalOwed = roundTo(balanceMap[balanceKey].totalOwed + s.amount);
  }
});
```

If `s.user` references a Member._id from another circle, `idToBalanceKey[userId]` is `undefined`, and the split amount is silently dropped. The expense amount is counted in `totalPaid` (because the payer is a circle member), but the split amount disappears from `totalOwed`. This creates an imbalance: `Σ netBalance ≠ 0`.

**Impact:** The zero-sum check at line 323-330 will fail for circles with cross-circle splits.

**Proof:** `idToBalanceKey` is built only from `members` of the current circle. Cross-circle Member._ids are not mapped.

---

### FIN-3: Settlement Party Resolution Maps Cross-Circle Members to Local Circle
**Severity:** Medium  
**Category:** Identity Resolution / Multiple Circles  
**File:** `backend/src/services/financial.engine.js:168-185`, `388-403`

**Finding:**
```js
const resolveSettlementParty = async (partyId) => {
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
```

If a settlement references a Member._id from another circle, `Member.findById(id)` finds that member document. If that member's `user` field matches a user in the current circle, `userToBalanceKey[userId]` returns the LOCAL circle's Member._id. The settlement amount is then applied to the LOCAL member's balance, not the actual member who was part of the settlement.

**Impact:** A settlement between members of circle A incorrectly affects balances in circle B if they share the same underlying User._id.

**Proof:** `Member.findById(id)` is not scoped to the current circle. It returns any member with that _id, regardless of circle.

---

### FIN-4: Bulk Move to Circle Does Not Validate Split Member Membership
**Severity:** Medium  
**Category:** Expense Operations / Multiple Circles  
**File:** `backend/src/services/expense.service.js:1119-1190`

**Finding:**
```js
async bulkMoveToCircle(expenseIds, targetCircleId, userId) {
  // ...
  expense.circle = targetCircleId;
  expense.currency = targetCircle.currency;
  await expense.save();
  // ... splits NOT updated, NO validation that split users are target circle members
}
```

When expenses are moved to another circle, the ExpenseSplit documents remain unchanged. If any split references a Member._id that is not in the target circle, `getCircleSummary` for the target circle will silently drop those splits from the balance calculation. The expense amount is counted in `totalPaid` but the split amounts disappear from `totalOwed`.

**Impact:** Moving expenses between circles can create zero-sum violations and invisible balances.

**Proof:** Traced `bulkMoveToCircle` → `expense.save()` only. No `ExpenseSplit.updateMany()` or membership validation.

---

### FIN-5: `getPeopleSummary` Calls `getCircleSummary` Per Circle (N+1)
**Severity:** Medium  
**Category:** Performance / Multiple Circles  
**File:** `backend/src/services/financial.engine.js:587-718`

**Finding:**
```js
for (const m of circleMembers) {
  // ...
  try {
    const circleSummary = await this.getCircleSummary(m.circle._id.toString(), userId);
    // ...
  } catch (err) {
    console.warn(`[FinancialEngine] Skipping circle ${m.circle?._id} in people summary: ${err.message}`);
  }
}
```

For each circle membership, `getCircleSummary` is called, which loads ALL expenses, splits, and settlements for that circle. A user in 10 circles triggers 10 separate `getCircleSummary` calls, each executing multiple DB queries.

**Impact:** Linear scaling with circle count. 10 circles → 50+ DB queries for a single `/users/me/people-summary` request.

**Proof:** `getPeopleSummary` iterates `circleMembers` and calls `getCircleSummary` inside the loop.

---

### FIN-6: `recalculateExpenseStatuses` Does Not Handle Cancelled Expenses
**Severity:** Low  
**Category:** Expense Lifecycle  
**File:** `backend/src/services/expense.service.js:1256-1291`

**Finding:**
```js
const ops = expenses.map(e => {
  const payerId = e.paidBy ? e.paidBy.toString() : null;
  const net = payerId ? (netByPayer[payerId] || 0) : 0;
  let status = EXPENSE_STATUS.PENDING;
  if (net <= 0) {
    status = EXPENSE_STATUS.SETTLED;
  } else if (hasCompletedSettlements) {
    status = EXPENSE_STATUS.PARTIALLY_SETTLED;
  }
  return {
    updateOne: {
      filter: { _id: e._id, status: { $ne: EXPENSE_STATUS.CANCELLED } },
      update: { $set: { status } },
    },
  };
});
```

The `recalculateExpenseStatuses` method skips expenses with `status: 'cancelled'` (via the filter `{ status: { $ne: EXPENSE_STATUS.CANCELLED } }`). However, there is no way to SET an expense to `cancelled` through any service method. The `EXPENSE_STATUS.CANCELLED` enum value exists but is never written by any code path. This means cancelled expenses are impossible to create through the API, making the filter dead code that obscures intent.

**Impact:** Dead code path; the `CANCELLED` status is defined but unreachable.

**Proof:** Searched all service methods for `EXPENSE_STATUS.CANCELLED` — only found in `recalculateExpenseStatuses` filter, never assigned.

---

## Verified Correct Behaviors

### Zero Sum (Partial)
**Status:** CONDITIONAL PASS  
**File:** `backend/src/services/financial.engine.js:322-330`

The zero-sum invariant is enforced:
```js
const sumNetBalances = roundTo(memberBalances.reduce((sum, b) => sum + b.netBalance, 0));
if (Math.abs(sumNetBalances) > 0.02) {
  // throw in dev, log in prod
}
```

This correctly detects violations within a single circle's scope. However, it does NOT detect violations caused by cross-circle splits (FIN-2) because the dropped split amounts cause `Σ netBalance` to be positive (more paid than owed within the circle), which the invariant catches — but only as a logged error in production, not as a blocked operation.

---

### Debt Matrix
**Status:** PASS  
**File:** `backend/src/services/financial.engine.js:352-431`

The debt matrix correctly:
1. Initializes `matrix[from][to] = 0` for all member pairs
2. Adds split amounts to `matrix[participant][payer]` (participant owes payer)
3. Subtracts settlement amounts from `matrix[from][to]` (settlement reduces debt)
4. Returns only relationships with `amount > 0.005`

The direction is consistent: `matrix[debtor][creditor]`.

---

### Settlement Algorithm
**Status:** PASS  
**File:** `backend/src/services/financial.engine.js:433-463`

The `_minimumTransferAlgorithm` correctly implements the greedy debt simplification:
1. Separates creditors (netBalance > 0) and debtors (netBalance < 0)
2. Matches largest creditor with largest debtor
3. Transfers min(creditor.remaining, debtor.remaining)
4. Advances pointer when either side is settled

This produces optimal (minimum number of transactions) settlement plans.

---

### Identity Resolution
**Status:** PASS (with FIN-3 exception)  
**Files:** `backend/src/services/financial.engine.js:30-50`, `168-185`

The dual-ID mapping correctly resolves both User._id and Member._id to canonical Member._id for circle members. The `_memberKey` and `_resolveMemberUserId` consistently use Member._id. The exception is FIN-3 (cross-circle member resolution).

---

### Guest Members
**Status:** PASS  
**File:** `backend/src/services/financial.engine.js:59-70`, `87-93`

Guest members (with `user: null`) are correctly:
1. Included in `memberBalances` with their Member._id as the canonical key
2. Named via `resolveMemberName` which falls back to `displayName` then `nickname`
3. Included in the debt matrix and settlement suggestions

---

### Registered Members
**Status:** PASS  
**File:** `backend/src/services/financial.engine.js:144-154`

Registered members (with `user: ObjectId`) are correctly:
1. Mapped via both `user._id` and `member._id` in `idToBalanceKey`
2. Named via `user.name` in `resolveMemberName`
3. Included in balances, debt matrix, and settlements

---

### Multiple Circles
**Status:** PASS (with FIN-5 exception)  
**File:** `backend/src/services/financial.engine.js:468-582`

`getDashboard` correctly iterates each circle membership, calls `getCircleSummary` for each, and aggregates balances. Each circle's Member._id is used as the key, so a user in multiple circles has independent balances per circle. The exception is FIN-5 (performance).

---

### Expense Delete
**Status:** PASS  
**File:** `backend/src/services/expense.service.js:375-417`

Soft delete sets `isDeleted = true`. `getCircleSummary` filters `isDeleted: false` for both expenses and splits, so deleted expenses automatically disappear from balance calculations. `recalculateExpenseStatuses` is called to update expense statuses.

---

### Settlement Cancel
**Status:** PASS  
**File:** `backend/src/services/settlement.service.js:569-638`

Cancellation sets `status = CANCELLED`. `getCircleSummary` only counts `COMPLETED` and `CONFIRMED` settlements in balance calculations, so cancelled settlements have no effect on balances. `recalculateExpenseStatuses` is called.

---

### Settlement Confirm
**Status:** PASS  
**File:** `backend/src/services/settlement.service.js:267-363`

Confirmation sets `status = CONFIRMED` and `confirmedByReceiver = true`. `getCircleSummary` counts CONFIRMED settlements in balances. The settlement amount is included in `memberSettlementStats`, which adjusts `netBalance` via:
```js
const adjustedNet = roundTo(expenseNet - ss.settlementsReceived + ss.settlementsSent);
```

This correctly reduces the payer's net balance and increases the receiver's.

---

### Settlement Complete
**Status:** PASS  
**File:** `backend/src/services/settlement.service.js:365-478`

Completion sets `status = COMPLETED`. The same balance adjustment logic applies. `recalculateExpenseStatuses` updates expense statuses to `SETTLED` or `PARTIALLY_SETTLED` based on the payer's new net balance.

---

### Cross Page Consistency
**Status:** PASS (with noted gaps)

| Page | Endpoint | Data Source | Consistent? |
|------|----------|-------------|-------------|
| Ledger | `/financial/users/me/dashboard` + `/financial/users/me/ledger` | FinancialEngine | YES |
| People | `/financial/users/me/people-summary` | FinancialEngine | YES |
| Circle Detail | `/financial/circles/:id/financial-summary` | FinancialEngine | YES |
| Entries | `/expenses` | ExpenseService | YES (same `isDeleted: false` filter) |
| Settlements | `/settlements` | SettlementService | YES |

All pages source financial values from the FinancialEngine or apply the same `isDeleted: false` filter. The only gap is that `getUserCircles` returns circles without financial data, so balance displays in the circles list rely on the frontend `useFinancialEngine` hook to augment them.

---

## Data Flow Trace

### Expense Creation
```
POST /api/v1/expenses
  → expenseController.createExpense
  → expenseService.createExpense
    1. Validate circle exists and is active
    2. Resolve payer User._id → Member._id (circle member check)
    3. splitEngine.calculate() → splits array
    4. Expense.create({ circle, paidBy: payerMemberId, ... })
    5. ExpenseSplit.insertMany(splits)
    6. Transaction.create({ type: 'expense', from: paidBy, to: paidBy, amount })
    7. activityService.createActivity()
    8. notifyCircle()
    9. emitToCircle('expense:created')
    10. recalculateExpenseStatuses()
    11. return getExpense()
```

### Balance Calculation (getCircleSummary)
```
GET /api/v1/financial/circles/:id/financial-summary
  → financialController.getCircleFinancialSummary
  → financialEngine.getCircleSummary
    1. Load members (with user populate)
    2. Build idToBalanceKey: { user._id: memberId, memberId: memberId }
    3. Load expenses (isDeleted: false)
    4. Load splits for those expenses
    5. Load settlements (isDeleted: false)
    6. Compute totalPaid per member from expenses[paidBy]
    7. Compute totalOwed per member from splits[user]
    8. Compute settlement adjustments for COMPLETED/CONFIRMED
    9. netBalance = totalPaid - totalOwed + settlementsReceived - settlementsSent
    10. Build debt matrix from expenses + settlements
    11. Run minimum transfer algorithm
    12. Validate zero-sum: Σ netBalance ≈ 0
```

### Settlement Flow
```
POST /api/v1/settlements
  → settlementController.createSettlement
  → settlementService.createSettlement
    1. Validate circle, membership, payer/receiver are members
    2. Check payer owes money (netBalance < -0.01)
    3. Create Settlement({ status: PENDING })
    4. ActivityLog + notifyUser + emitToCircle
    5. return populated settlement

POST /api/v1/settlements/:id/confirm
  → settlementService.confirmSettlement
    1. Resolve settlement.from/to to Member._id
    2. Check caller is receiver or owner/recorder
    3. Set status = CONFIRMED, confirmedByReceiver = true
    4. ActivityLog + notifyUser + emitToCircle
    5. recalculateExpenseStatuses()

POST /api/v1/settlements/:id/complete
  → settlementService.completeSettlement
    1. Resolve settlement.from/to to Member._id
    2. Check caller is involved party or owner/recorder
    3. Set status = COMPLETED, completedAt
    4. ActivityLog + notifyUser + emitToCircle
    5. recalculateExpenseStatuses()
```

---

## Summary Table

| Check | Status | Notes |
|-------|--------|-------|
| **Zero Sum** | CONDITIONAL PASS | Enforced per-circle, but cross-circle splits can violate (FIN-2) |
| **Debt Matrix** | PASS | Direction and calculation verified |
| **Settlement Algorithm** | PASS | Minimum transfer algorithm is correct |
| **Identity Resolution** | PASS | Dual-ID mapping works within circle; cross-circle mapping bug (FIN-3) |
| **Guest Members** | PASS | Included with correct naming fallback |
| **Registered Members** | PASS | Mapped via both User._id and Member._id |
| **Multiple Circles** | PASS | Independent balances per circle; performance issue (FIN-5) |
| **Expense Updates** | FAIL | Amount changes do not recalculate splits (FIN-1) |
| **Expense Delete** | PASS | Soft delete + on-demand computation preserves invariant |
| **Settlement Cancel** | PASS | CANCELLED status excluded from balance calc |
| **Settlement Confirm** | PASS | CONFIRMED included in balance calc |
| **Cross Page Consistency** | PASS | All pages use FinancialEngine or same filters |

---

## Recommendations

### REC-1: Recalculate Splits on Expense Amount Change
**Priority:** High  
**File:** `backend/src/services/expense.service.js:317-370`

When `data.amount` is present in `updateExpense`, recalculate splits:
```js
if (data.amount !== undefined && data.amount !== expense.amount) {
  const normalizedSplits = expense.splits.map(s => ({ user: s.user, shares: s.shares || 1, percentage: s.percentage }));
  const splitResult = splitEngine.calculate(data.amount, expense.splitMethod, normalizedSplits);
  await ExpenseSplit.deleteMany({ expense: expenseId });
  await ExpenseSplit.insertMany(splitResult.splits.map(s => ({ expense: expenseId, user: s.user, amount: s.amount, percentage: s.percentage, shares: s.shares })));
}
```

### REC-2: Validate Split Users Are Circle Members
**Priority:** High  
**File:** `backend/src/services/expense.service.js:82-103`

Before creating splits, verify each split user is an active member of the circle:
```js
const splitUserIds = splits.map(s => s.user);
const validMembers = await Member.find({ _id: { $in: splitUserIds }, circle: circleId, isActive: true }).select('_id');
const validMemberIds = new Set(validMembers.map(m => m._id.toString()));
const invalidUsers = splitUserIds.filter(id => !validMemberIds.has(id));
if (invalidUsers.length > 0) throw ApiError.badRequest(`Invalid split users: ${invalidUsers.join(', ')}`);
```

### REC-3: Scope Settlement Party Resolution to Circle
**Priority:** Medium  
**File:** `backend/src/services/financial.engine.js:168-185`

Add circle filter to `Member.findById`:
```js
const doc = await Member.findOne({ _id: id, circle: circleObjectId, isActive: true, isDeleted: false }).select('user').lean();
```

This prevents cross-circle member resolution.

### REC-4: Validate/Copy Splits on Circle Move
**Priority:** Medium  
**File:** `backend/src/services/expense.service.js:1119-1190`

After moving an expense to a new circle, validate that all split users are members of the target circle. If not, either reject the move or recreate splits for target circle members.

### REC-5: Optimize getPeopleSummary
**Priority:** Medium  
**File:** `backend/src/services/financial.engine.js:587-718`

Replace per-circle `getCircleSummary` calls with a single aggregation that loads all expenses/splits/settlements for all user circles at once, then groups by circle in memory.

### REC-6: Remove Unreachable CANCELLED Status Filter
**Priority:** Low  
**File:** `backend/src/services/expense.service.js:1282`

Either implement a `cancelExpense` method that sets `status = CANCELLED`, or remove the `CANCELLED` enum value and the dead filter to reduce confusion.
