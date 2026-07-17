/**
 * ExpenseFlow - Frontend Split Calculator
 *
 * A pure, dependency-free mirror of the backend SplitEngine so the New Expense
 * live preview shows EXACTLY what the server will compute. The backend remains
 * the single source of truth; this is only for instant, optimistic UI feedback.
 *
 * Methods supported: equal | percentage | exact | shares | custom
 * Rounding matches backend `roundTo` (Math.round(x*100)/100).
 */

export function roundTo(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate split allocations for the live preview.
 * @param {number} totalAmount
 * @param {'equal'|'percentage'|'exact'|'shares'|'custom'} method
 * @param {Array<{user:string, amount?:number, percentage?:number, shares?:number}>} splits
 * @returns {{success:boolean, splits:Array, method, summary, error?:string}}
 */
export function calculateSplit(totalAmount, method, splits) {
  const amount = Number(totalAmount) || 0;
  if (amount <= 0) {
    return { success: false, splits: [], method, summary: null, error: 'Amount must be greater than 0' };
  }
  if (!Array.isArray(splits) || splits.length === 0) {
    return { success: false, splits: [], method, summary: null, error: 'At least one participant is required' };
  }

  const normalized = splits.map((s) => ({
    user: s.user,
    amount: typeof s.amount === 'number' ? s.amount : 0,
    percentage: typeof s.percentage === 'number' ? s.percentage : 0,
    shares: typeof s.shares === 'number' && Number.isInteger(s.shares) && s.shares >= 1 ? s.shares : 1,
  }));

  try {
    switch (method) {
      case 'equal':
        return buildResponse(amount, method, equalSplit(amount, normalized));
      case 'percentage':
        return buildResponse(amount, method, percentageSplit(amount, normalized));
      case 'exact':
        return buildResponse(amount, method, exactSplit(amount, normalized));
      case 'shares':
        return buildResponse(amount, method, sharesSplit(amount, normalized));
      case 'custom':
        return buildResponse(amount, method, customSplit(amount, normalized));
      default:
        return { success: false, splits: [], method, summary: null, error: 'Invalid split method' };
    }
  } catch (err) {
    return { success: false, splits: [], method, summary: null, error: err.message };
  }
}

function equalSplit(total, splits) {
  const n = splits.length;
  const base = roundTo(total / n);
  const remainder = roundTo(total - base * n);
  return splits.map((s, i) => ({
    user: s.user,
    amount: i === 0 ? roundTo(base + remainder) : base,
    percentage: roundTo((100 / n) * 100) / 100,
    shares: 1,
  }));
}

function percentageSplit(total, splits) {
  const totalPct = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
  if (Math.abs(totalPct - 100) >= 0.01) {
    throw new Error(`Percentages must total exactly 100% (got ${roundTo(totalPct)}%)`);
  }
  let sum = 0;
  const result = splits.map((s) => {
    const amt = roundTo(total * (s.percentage / 100));
    sum = roundTo(sum + amt);
    return { user: s.user, amount: amt, percentage: s.percentage, shares: 1 };
  });
  const remainder = roundTo(total - sum);
  if (Math.abs(remainder) > 0.005) result[0].amount = roundTo(result[0].amount + remainder);
  return result;
}

function exactSplit(total, splits) {
  const totalExact = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
  if (Math.abs(totalExact - total) > 0.01) {
    throw new Error(`Exact amounts must equal total expense (got ${roundTo(totalExact)})`);
  }
  return splits.map((s) => ({ user: s.user, amount: roundTo(s.amount || 0), percentage: 0, shares: 1 }));
}

function sharesSplit(total, splits) {
  const totalShares = splits.reduce((sum, s) => sum + (s.shares || 1), 0);
  if (totalShares <= 0) throw new Error('Total shares must be greater than 0');
  const shareValue = roundTo(total / totalShares);
  const remainder = roundTo(total - shareValue * totalShares);
  let running = 0;
  const result = splits.map((s, i) => {
    const amt = i === 0 ? roundTo(shareValue * s.shares + remainder) : roundTo(shareValue * s.shares);
    running = roundTo(running + amt);
    return { user: s.user, amount: amt, percentage: roundTo((s.shares / totalShares) * 10000) / 100, shares: s.shares };
  });
  return result;
}

function customSplit(total, splits) {
  const result = splits.map((s) => {
    const amt = s.amount || 0;
    if (amt < 0) throw new Error('Split amounts cannot be negative');
    return { user: s.user, amount: roundTo(amt), percentage: 0, shares: 1 };
  });
  const sum = result.reduce((acc, r) => acc + r.amount, 0);
  if (Math.abs(sum - total) > 0.01) {
    throw new Error(`Custom split amounts must equal total expense (got ${roundTo(sum)})`);
  }
  return result;
}

function buildResponse(total, method, splits) {
  const sum = roundTo(splits.reduce((acc, s) => acc + s.amount, 0));
  return {
    success: true,
    method,
    splits,
    summary: {
      totalAmount: roundTo(total),
      allocatedAmount: sum,
      splitCount: splits.length,
      remainder: roundTo(total - sum),
    },
  };
}

/**
 * Minimum Transfer Algorithm — mirrors FinancialEngine.calculateSettlements.
 * Used for the live "who owes whom" preview before saving.
 * @param {Array<{id:string, name:string, balance:number}>} members
 * @returns {Array<{from, to, amount}>}
 */
export function previewSettlements(members) {
  const map = {};
  (members || []).forEach((m) => {
    map[m.id] = { id: m.id, name: m.name, balance: roundTo(m.balance) };
  });

  const creditors = Object.values(map).filter((m) => m.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = Object.values(map).filter((m) => m.balance < -0.01).sort((a, b) => a.balance - b.balance);

  const suggestions = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    if (amount > 0.01) {
      suggestions.push({
        from: { id: debtor.id, name: debtor.name },
        to: { id: creditor.id, name: creditor.name },
        amount: roundTo(amount),
      });
    }
    creditor.balance = roundTo(creditor.balance - amount);
    debtor.balance = roundTo(debtor.balance + amount);
    if (creditor.balance < 0.01) ci++;
    if (debtor.balance > -0.01) di++;
  }
  return suggestions;
}