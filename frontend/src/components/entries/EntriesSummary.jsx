import { useMemo } from 'react';
import { formatCurrency } from '../../services/currency.service';

/**
 * EntriesSummary Component
 * Displays summary statistics dashboard for entries
 */
export default function EntriesSummary({ statistics, isLoading, userCurrency = 'USD' }) {
  const stats = useMemo(() => {
    if (!statistics) return null;

    return {
      totalExpenses: statistics.totalExpenses || 0,
      thisMonthSpending: statistics.thisMonthAmount || 0,
      pendingSettlement: statistics.pendingSettlementAmount || 0,
      averageExpense: statistics.averageExpense || 0,
      activeCircles: statistics.activeCircles || 0,
      receiptsUploaded: statistics.receiptsUploaded || 0,
      archivedExpenses: statistics.archivedExpenses || 0,
    };
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-24 bg-paper-deep animate-pulse border border-rule" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const summaryItems = [
    {
      label: 'Total Expenses',
      value: stats.totalExpenses.toLocaleString(),
    },
    {
      label: 'This Month',
      value: formatCurrency(stats.thisMonthSpending, userCurrency, { useLargeNumberFormat: true }),
    },
    {
      label: 'Pending Settlement',
      value: formatCurrency(stats.pendingSettlement, userCurrency, { useLargeNumberFormat: true }),
    },
    {
      label: 'Average Expense',
      value: formatCurrency(stats.averageExpense, userCurrency, { useLargeNumberFormat: true }),
    },
    {
      label: 'Active Circles',
      value: stats.activeCircles.toString(),
    },
    {
      label: 'Receipts',
      value: stats.receiptsUploaded.toLocaleString(),
    },
    {
      label: 'Archived',
      value: stats.archivedExpenses.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
      {summaryItems.map((item, index) => (
        <div
          key={index}
          className="border border-rule bg-paper p-4 hover:border-ink transition-colors"
        >
          <div className="text-2xl mb-2">{item.icon}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-1">
            {item.label}
          </div>
          <div className="font-display text-xl md:text-2xl leading-none">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}