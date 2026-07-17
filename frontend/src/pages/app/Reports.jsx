import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useFinancialEngine } from "../../services/financial.engine";
import { getMonthlyReport, exportReport } from "../../services/report.service";
import { Figure, Pill } from "../../components/ui/Primitives";
import { formatCurrency } from "../../services/currency.service";
import { Download, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCurrency = engine.userCurrency;
  const [reportType, setReportType] = useState("monthly");
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const reportData = reports || { summary: {}, expenses: [], settlements: [] };
      await exportReport({ report: reportData, format });
      toast.success(`${format.toUpperCase()} exported`);
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const { data: reports, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reports", reportType],
    queryFn: () => getMonthlyReport({ period: reportType }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading reports&hellip;
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="border-2 border-vermilion bg-vermilion/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion mb-3">
            Failed to load reports
          </div>
          <p className="text-sm text-ink-soft mb-4">{error?.message || "An error occurred"}</p>
          <button
            onClick={() => refetch()}
            className="h-9 px-4 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = reports?.summary || {};
  const expenses = reports?.expenses || [];
  const settlements = reports?.settlements || [];

  return (
    <div>
      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="flex items-center gap-3 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
            Folio V · Reports
          </div>
          <div className="h-px flex-1 bg-ink" />
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Your <em className="italic">story.</em>
        </h1>
        <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
          Detailed reports and exports for accounting, taxes, or personal records.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Total spend</div>
            <Figure value={summary.totalSpend || 0} currency={userCurrency} size="lg" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              {reportType === 'monthly' ? 'This month' : reportType === 'yearly' ? 'This year' : 'All time'}
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Expenses</div>
            <div className="font-figure tabular-nums text-4xl text-ink">{summary.expenseCount || 0}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Total entries
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Settlements</div>
            <div className="font-figure tabular-nums text-4xl text-ledger">{summary.settlementCount || 0}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Completed
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Avg expense</div>
            <Figure
              value={summary.expenseCount > 0 ? (summary.totalSpend || 0) / summary.expenseCount : 0}
              currency={userCurrency}
              size="lg"
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Per entry
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all">All time</option>
          </select>
          <button onClick={() => handleExport('csv')} disabled={exporting} className="h-10 px-4 inline-flex items-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting} className="h-10 px-4 inline-flex items-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition disabled:opacity-50">
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="px-5 md:px-10 lg:px-14 py-10">
        {/* Expenses Table */}
        <div className="border border-ink bg-card p-6 mb-8">
          <div className="eyebrow mb-6">Expenses</div>
          {expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Date</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Description</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Category</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Circle</th>
                    <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, idx) => (
                    <tr key={idx} className="border-b border-rule hover:bg-paper-deep/40 transition">
                      <td className="py-3 font-mono text-xs">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-display text-base">{expense.description}</td>
                      <td className="py-3">
                        <Pill tone="neutral" className="text-[9px]">{expense.category}</Pill>
                      </td>
                      <td className="py-3 text-sm text-ink-soft">{expense.circleName}</td>
                      <td className="py-3 text-right">
                        <Figure value={expense.amount} currency={expense.currency || userCurrency} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No expenses in this period</div>
          )}
        </div>

        {/* Settlements Table */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Settlements</div>
          {settlements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Date</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">From</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">To</th>
                    <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Status</th>
                    <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement, idx) => (
                    <tr key={idx} className="border-b border-rule hover:bg-paper-deep/40 transition">
                      <td className="py-3 font-mono text-xs">
                        {new Date(settlement.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-display text-base">{settlement.from}</td>
                      <td className="py-3 font-display text-base">{settlement.to}</td>
                      <td className="py-3">
                        <Pill
                          tone={settlement.status === 'completed' ? 'ledger' : settlement.status === 'pending' ? 'vermilion' : 'neutral'}
                          className="text-[9px]"
                        >
                          {settlement.status}
                        </Pill>
                      </td>
                      <td className="py-3 text-right">
                        <Figure value={settlement.amount} currency={settlement.currency || userCurrency} size="sm" tone="ledger" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No settlements in this period</div>
          )}
        </div>
      </div>
    </div>
  );
}