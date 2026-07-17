/**
 * ExpenseFlow - Split Engine
 *
 * ─── Financial Architecture ──────────────────────────────────────────────
 *
 * Lifecycle Models:
 *
 *   Expense
 *   ├─ circle, paidBy, title, description, amount, currency
 *   ├─ splitMethod, category, date, status
 *   ├─ receipts[], isRecurring, recurringConfig
 *   ├─ notes, tags
 *   ├─ isDeleted, deletedAt, deletedBy
 *   └─ virtual: expenseSplits -> ExpenseSplit[]
 *
 *   ExpenseSplit
 *   ├─ expense, user, amount, percentage, shares
 *   ├─ isSettled, settledAt
 *   └─ unique index: (expense, user)
 *
 *   Settlement
 *   ├─ circle, from, to, amount, currency
 *   ├─ status, paymentMethod, paymentReference
 *   ├─ confirmedByReceiver, confirmedAt, completedAt
 *   └─ isDeleted
 *
 *   Transaction
 *   ├─ circle, type, referenceId, referenceModel
 *   ├─ from, to, amount, currency
 *   ├─ description, status, isDeleted
 *   └─ createdAt ledger index
 *
 * Lifecycle Flows:
 *
 *   Expense Lifecycle:
 *     1. Create → validate circle + membership → calculate splits → persist
 *     2. Update → if amount/splits changed → recalculate → reverse old + apply new
 *     3. Delete (soft) → reverse balances → mark deleted
 *     4. Cancel → status = 'cancelled' → freeze splits
 *
 *   Split Lifecycle:
 *     1. Calculated → stored on ExpenseSplit at create
 *     2. Settled → settlement marks from→to; ExpenseSplit.isSettled updates via service
 *     3. Adjusted → recalculateAll on circle (recalculation workflow)
 *
 *   Balance Lifecycle:
 *     Member.totalPaid += expense.amount (payer)
 *     Member.totalOwed += split.amount (each participant)
 *     netBalance = totalPaid - totalOwed
 *   Negative balance means they are owed money.
 *   Settlements transfer debt and recalculate mid-flight.
 *
 *   Settlement Lifecycle:
 *     1. Create → status=PENDING
 *     2. Confirm → confirmedByReceiver=true, confirmedAt
 *     3. Complete → status=COMPLETED, completedAt
 *     4. Cancel → status=CANCELLED
 *     Recalculate member balances on complete/cancel.
 *
 *   Editing Workflow:
 *     - Only payer can edit
 *     - On amount/split change → Old splits reversed, new splits calculated, activity logged
 *     - History preserved via ActivityLog + Transaction references
 *
 *   Delete Workflow:
 *     - Soft delete only
 *     - Reverses member.netBalance and circle totals
 *     - Does not hard delete to preserve audit trail
 *
 *   Recalculation Workflow:
 *     Triggered on: expense update, settlement completion, settlement cancellation
 *     Steps:
 *       1. Remove all existing settlements for circle
 *       2. Recompute net balances from expense splits
 *       3. Recompute optimal settlement graph
 *       4. Create new settlements
 *       5. Update member netBalances
 *
 *   Transaction History Strategy:
 *     Every financial mutation appends a Transaction record.
 *     referenceId + referenceModel allows polymorphic lookup.
 *     isDeleted=false filter preserves history while hiding deleted items.
 *
 *   Audit Strategy:
 *     ActivityLog for user-visible events (per circle)
 *     Transaction for immutable ledger entries (per circle)
 *     AuditLog for system-level events (cross-cutting)
 *     No hard deletes. Deletion marks isDeleted=true.
 *
 * ─── Split Engine Contract ───────────────────────────────────────────────
 *
 *  Input:
 *   - totalAmount: number > 0
 *   - method: 'equal' | 'percentage' | 'exact' | 'shares' | 'custom'
 *   - splits: Array<{ user: string, amount?: number, percentage?: number, shares?: number }>
 *   - context: { ArchivedCircle?, deletedCircle? } (optional)
 *
 *  Output:
 *   { success: true, splits: Array<{ user, amount, percentage, shares }>, method, summary }
 *   or throw ApiError with specific message.
 *
 *  Determinism:
 *   - Equal / Shares: first member absorbs rounding remainder
 *   - Percentage / Exact / Custom: amounts validated to sum exactly to totalAmount
 */
const ApiError = require('../utils/ApiError');
const { roundTo } = require('../utils/helpers');
const { SPLIT_METHODS } = require('../constants');

class SplitEngine {
  /**
   * Calculate split allocations with full business rule validation.
   */
  calculate(totalAmount, method, splits, context = {}) {
    this._validateInput(totalAmount, method, splits, context);
    const normalizedSplits = this._normalizeAndDeduplicate(splits);

    switch (method) {
      case SPLIT_METHODS.EQUAL:
        return this._equalSplit(totalAmount, normalizedSplits);
      case SPLIT_METHODS.PERCENTAGE:
        return this._percentageSplit(totalAmount, normalizedSplits);
      case SPLIT_METHODS.EXACT:
        return this._exactSplit(totalAmount, normalizedSplits);
      case SPLIT_METHODS.SHARES:
        return this._sharesSplit(totalAmount, normalizedSplits);
      case SPLIT_METHODS.CUSTOM:
        return this._customSplit(totalAmount, normalizedSplits);
      default:
        throw ApiError.badRequest('Invalid split method', { method });
    }
  }

  /**
   * Validate top-level constraints before any calculation.
   */
  _validateInput(totalAmount, method, splits, context) {
    if (typeof totalAmount !== 'number' || !isFinite(totalAmount) || totalAmount <= 0) {
      throw ApiError.badRequest('Amount must be a positive number', { totalAmount });
    }

    if (!Object.values(SPLIT_METHODS).includes(method)) {
      throw ApiError.badRequest('Invalid split method', { method });
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      throw ApiError.badRequest('At least one split is required', { count: splits?.length });
    }

    if (context.archivedCircle) {
      throw ApiError.badRequest('Archived circles cannot have new expenses', { circleId: context.circleId });
    }

    if (context.deletedCircle) {
      throw ApiError.badRequest('Deleted circles reject all operations', { circleId: context.circleId });
    }
  }

  /**
   * Remove duplicates while preserving order.
   */
  _normalizeAndDeduplicate(splits) {
    const seen = new Set();
    const unique = [];
    for (const s of splits) {
      if (!s.user || typeof s.user !== 'string') {
        throw ApiError.badRequest('Each split must have a valid user ID', { split: s });
      }
      if (seen.has(s.user)) {
        throw ApiError.badRequest('Duplicate members in splits', { userId: s.user });
      }
      seen.add(s.user);
      unique.push({
        user: s.user,
        amount: typeof s.amount === 'number' ? s.amount : 0,
        percentage: typeof s.percentage === 'number' ? s.percentage : 0,
        shares: typeof s.shares === 'number' && Number.isInteger(s.shares) && s.shares >= 1
          ? s.shares
          : 1,
      });
    }
    return unique;
  }

  /**
   * Equal split:
   *   base = round(total / n)
   *   remainder = round(total - base * n)
   *   first member receives remainder to consume rounding error.
   */
  _equalSplit(totalAmount, splits) {
    const n = splits.length;
    const base = roundTo(totalAmount / n);
    const remainder = roundTo(totalAmount - base * n);

    const result = splits.map((s, i) => ({
      user: s.user,
      amount: i === 0 ? roundTo(base + remainder) : base,
      percentage: roundTo((100 / n) * 100) / 100,
      shares: 1,
    }));

    return this._buildResponse(totalAmount, SPLIT_METHODS.EQUAL, result);
  }

  /**
   * Percentage split:
   *   Each amount = round(total * percentage / 100)
   *   Validates sum of percentages == 100
   *   Rounding error absorbed in first member.
   */
  _percentageSplit(totalAmount, splits) {
    const totalPct = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) >= 0.01) {
      throw ApiError.badRequest(
        `Percentages must total exactly 100% (got ${roundTo(totalPct)}%)`,
        { totalPercentage: roundTo(totalPct) }
      );
    }

    let calculatedSum = 0;
    const result = splits.map((s) => {
      const raw = totalAmount * (s.percentage / 100);
      const amount = roundTo(raw);
      calculatedSum = roundTo(calculatedSum + amount);
      return {
        user: s.user,
        amount,
        percentage: s.percentage,
        shares: 1,
      };
    });

    const remainder = roundTo(totalAmount - calculatedSum);
    if (Math.abs(remainder) > 0.005) {
      result[0].amount = roundTo(result[0].amount + remainder);
    }

    return this._buildResponse(totalAmount, SPLIT_METHODS.PERCENTAGE, result);
  }

  /**
   * Exact amount split:
   *   Uses user-provided amounts directly.
   *   Validates sum == totalAmount.
   */
  _exactSplit(totalAmount, splits) {
    const totalExact = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    if (Math.abs(totalExact - totalAmount) > 0.01) {
      throw ApiError.badRequest(
        `Exact amounts must equal total expense (got ${roundTo(totalExact)})`,
        { totalExact: roundTo(totalExact), totalAmount: roundTo(totalAmount) }
      );
    }

    const result = splits.map((s) => ({
      user: s.user,
      amount: roundTo(s.amount || 0),
      percentage: 0,
      shares: 1,
    }));

    return this._buildResponse(totalAmount, SPLIT_METHODS.EXACT, result);
  }

  /**
   * Shares split:
   *   Each amount = round(total * userShares / totalShares)
   *   Remainder absorbed by first member.
   */
  _sharesSplit(totalAmount, splits) {
    const totalShares = splits.reduce((sum, s) => sum + (s.shares || 1), 0);
    if (totalShares <= 0) {
      throw ApiError.badRequest('Total shares must be greater than 0');
    }

    const shareValue = roundTo(totalAmount / totalShares);
    const remainder = roundTo(totalAmount - shareValue * totalShares);

    let runningSum = 0;
    const result = splits.map((s, i) => {
      const amount = i === 0
        ? roundTo(shareValue * s.shares + remainder)
        : roundTo(shareValue * s.shares);
      runningSum = roundTo(runningSum + amount);
      return {
        user: s.user,
        amount,
        percentage: roundTo((s.shares / totalShares) * 10000) / 100,
        shares: s.shares,
      };
    });

    return this._buildResponse(totalAmount, SPLIT_METHODS.SHARES, result);
  }

  /**
   * Custom split:
   *   Free-form. Validates negative values and total sum.
   */
  _customSplit(totalAmount, splits) {
    const result = splits.map((s) => {
      const amount = s.amount || 0;
      if (amount < 0) {
        throw ApiError.badRequest('Split amounts cannot be negative', { userId: s.user, amount });
      }
      return {
        user: s.user,
        amount: roundTo(amount),
        percentage: 0,
        shares: 1,
      };
    });

    const total = result.reduce((sum, r) => sum + r.amount, 0);
    if (Math.abs(total - totalAmount) > 0.01) {
      throw ApiError.badRequest(
        `Custom split amounts must equal total expense (got ${roundTo(total)})`,
        { total: roundTo(total), totalAmount: roundTo(totalAmount) }
      );
    }

    return this._buildResponse(totalAmount, SPLIT_METHODS.CUSTOM, result);
  }

  /**
   * Assemble final envelope.
   */
  _buildResponse(totalAmount, method, splits) {
    const sum = roundTo(splits.reduce((acc, s) => acc + s.amount, 0));
    if (Math.abs(sum - totalAmount) > 0.005) {
      throw ApiError.internal(
        'Split calculation produced amounts that do not reconcile to total',
        { sum, totalAmount }
      );
    }
    return {
      success: true,
      method,
      splits,
      summary: {
        totalAmount: roundTo(totalAmount),
        allocatedAmount: sum,
        splitCount: splits.length,
        remainder: roundTo(totalAmount - sum),
      },
    };
  }
}

module.exports = new SplitEngine();
