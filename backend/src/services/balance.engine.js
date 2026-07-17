/**
 * ExpenseFlow - Balance Engine (Legacy Compatibility)
 *
 * NOTE: Per the Financial Engine Specification, member balances (totalPaid,
 * totalOwed, netBalance) are DERIVED values and MUST NEVER be stored on the
 * Member document. They are computed on-demand via the FinancialEngine.
 *
 * This module is retained as a thin compatibility wrapper during the
 * migration. All balance logic has moved to FinancialEngine.
 */

class BalanceEngine {
  async recalculateCircleBalances() {
    return true;
  }

  async adjustMemberExit(_circleId, _userId) {
    return true;
  }

  async adjustCircleDeletion(_circleId) {
    return true;
  }

  async applyExpenseCreated(_expense) {
    return true;
  }

  async applyExpenseUpdated(_expense, _oldAmount, _oldSplits) {
    return true;
  }

  async applyExpenseDeleted(_expense) {
    return true;
  }

  async applySettlementConfirmed(_settlement) {
    return true;
  }

  async _triggerSettlementRecalculation(_circleId) {
    return true;
  }
}

module.exports = new BalanceEngine();
