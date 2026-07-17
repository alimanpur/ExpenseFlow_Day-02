import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { getAnalyticsSummary } from "../services/financial.engine.api";
import { Figure, Pill } from "../components/ui/Primitives";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Analytics() {
  const engine = useFinancialEngine();
  const { user } = useAuth();
  const userCurrency = engine.userCurrency;
  const [period, setPeriod] = useState("6m");

  const { data: analytics = {}, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => getAnalyticsSummary(period),
    staleTime: 2 * 60 * 1000,
  });

  if (engine.isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading analytics&hellip;
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="border-2 border-vermilion bg-vermilion/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion mb-3">
            Failed to load analytics
          </div>
          <p className="text-sm text-ink-soft mb-4">{error?.message || "An error occurred"}</p>
          <button
            onClick={() => engine.refreshAfterAction('EXPENSE_CREATED')}
            className="h-9 px-4 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="flex items-center gap-3 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
          IV · Analytics
          </div>
          <div className="h-px flex-1 bg-ink" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 px-3 border-2 border-ink bg-card font-mono text-[10px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Numbers with <em className="italic">purpose.</em>
        </h1>
        <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
          Deep insights into your spending patterns, circle activity, and financial trends.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox
            label="Total spend"
            value={<Figure value={analytics.total} currency={userCurrency} size="xl" />}
            subtext="All time"
          />
          <StatBox
            label="This month"
            value={<Figure value={analytics.thisMonth} currency={userCurrency} size="xl" />}
            subtext={`${analytics.momChange > 0 ? "+" : ""}${analytics.momChange}% vs last`}
            trend={analytics.momChange > 0 ? "up" : "down"}
          />
          <StatBox
            label="Average"
            value={<Figure value={analytics.average} currency={userCurrency} size="xl" />}
            subtext="Per month"
          />
          <StatBox
            label="Per entry"
            value={<Figure value={analytics.avgPerExpense} currency={userCurrency} size="xl" />}
            subtext={`${analytics.expenseCount} total`}
          />
        </div>
      </div>

      {/* Charts & Breakdowns */}
      <div className="px-5 md:px-10 lg:px-14 py-10 grid lg:grid-cols-2 gap-10">
        {/* Monthly Trend */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Monthly trend</div>
          {analytics.monthlyTrend.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthlyTrend.map((m, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted w-16">
                    {m.month}
                  </div>
                  <div className="flex-1 h-8 bg-paper-deep relative">
                    <div
                      className="h-full bg-ink transition-all"
                      style={{ width: `${Math.min((m.value / Math.max(...analytics.monthlyTrend.map(t => t.value))) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="font-mono text-xs w-20 text-right">
                    <Figure value={m.value} currency={userCurrency} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No data available</div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Category breakdown</div>
          {analytics.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryBreakdown.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-rule hover:border-ink transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg">{c.category}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                      {c.count} expenses
                    </div>
                  </div>
                  <Figure value={c.value} currency={userCurrency} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No data available</div>
          )}
        </div>

        {/* Top Expenses */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Top expenses</div>
          {analytics.topExpenses.length > 0 ? (
            <div className="space-y-3">
              {analytics.topExpenses.map((expense, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-rule hover:border-ink transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base leading-tight">{expense.description}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                      {expense.category} · {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </div>
                  <Figure value={expense.amount} currency={expense.currency || userCurrency} size="sm" tone="ink" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No expenses yet</div>
          )}
        </div>

        {/* Circle Performance */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Circle performance</div>
          {(analytics?.circles || []).length > 0 ? (
            <div className="space-y-3">
              {(analytics?.circles || []).map((circle, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-rule hover:border-ink transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base leading-tight">{circle.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                      {circle.count} expenses
                    </div>
                  </div>
                  <Figure value={circle.value || 0} currency={userCurrency} size="sm" tone="ink" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No circles yet</div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Weekly trend</div>
          {analytics.weeklyTrend.length > 0 ? (
            <div className="space-y-2">
              {analytics.weeklyTrend.slice(-12).map((w, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted w-20 truncate">
                    {w.week}
                  </div>
                  <div className="flex-1 h-6 bg-paper-deep relative">
                    <div
                      className="h-full bg-ink/60 transition-all"
                      style={{ width: `${Math.min((w.value / Math.max(...analytics.weeklyTrend.map(t => t.value))) * 100, 100)}%` }}
                    />
                  </div>
                  <Figure value={w.value} currency={userCurrency} size="xs" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No data available</div>
          )}
        </div>

        {/* Member Breakdown */}
        <div className="border border-ink bg-card p-6">
          <div className="eyebrow mb-6">Top payers</div>
          {analytics.memberBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.memberBreakdown.slice(0, 8).map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-rule hover:border-ink transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base leading-tight">{m.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                      {m.count} payments
                    </div>
                  </div>
                  <Figure value={m.value} currency={userCurrency} size="sm" tone="ink" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Top Category Highlight */}
      {analytics.topCategory && analytics.topCategory.category !== 'None' && (
        <div className="px-5 md:px-10 lg:px-14 pb-10">
          <div className="border-2 border-ink bg-card p-8">
            <div className="eyebrow mb-4">Top spending category</div>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-2xl mb-1">{analytics.topCategory.category}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  {analytics.topCategory.pct || 0}% of total
                </div>
              </div>
              <Figure value={analytics.topCategory.value} currency={userCurrency} size="md" tone="ink" />
            </div>
          </div>
        </div>
      )}

      {/* Empty state for no data */}
      {analytics.total === 0 && (
        <div className="px-5 md:px-10 lg:px-14 pb-10">
          <div className="border-2 border-dashed border-rule p-16 text-center">
            <div className="font-display text-2xl mb-2">No analytics yet</div>
            <p className="text-ink-muted">Add expenses to your circles to see spending insights.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, subtext, trend }) {
  return (
    <div className="border border-ink bg-card p-6">
      <div className="eyebrow mb-3">{label}</div>
      <div className="flex items-start justify-between">
        <div>{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-vermilion' : 'text-ledger'}`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
        )}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
        {subtext}
      </div>
    </div>
  );
}