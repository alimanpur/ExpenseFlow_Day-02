import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AvatarDot, Figure, Pill, Stamp } from "../components/ui/Primitives";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { ArrowRight, Plus, Search, RefreshCw, Users, DollarSign, CheckCircle } from "lucide-react";
import { formatCurrency } from "../services/currency.service";

export default function Ledger() {
  const engine = useFinancialEngine();
  const { user } = useAuth();
  const userCurrency = engine.userCurrency;
  const [selectedCircle, setSelectedCircle] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [searchQuery, setSearchQuery] = useState("");

  // All data comes from the FinancialEngine
  const { expenses, circles, settlements, dashboard, isLoading, isError, error } = engine;
  
  // Use dashboard directly for all balance calculations
  const netBalance = dashboard || {};
  const filteredExpenses = useMemo(() => {
    let filtered = [...(expenses || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (selectedCircle !== "all") {
      filtered = filtered.filter(e => e.circleId === selectedCircle || e.groupId === selectedCircle);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }

    const now = new Date();
    if (dateRange === "7d") {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
    } else if (dateRange === "30d") {
      const monthAgo = new Date(now.setDate(now.getDate() - 30));
      filtered = filtered.filter(e => new Date(e.date) >= monthAgo);
    }

    return filtered;
  }, [expenses, selectedCircle, dateRange, searchQuery]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map();
    filteredExpenses.forEach(e => {
      if (!groups.has(e.date)) groups.set(e.date, []);
      groups.get(e.date).push(e);
    });
    return groups;
  }, [filteredExpenses]);

  // Category spending from FinancialEngine
  const categorySpending = dashboard?.topCategories || [];
  const totalThisMonth = dashboard?.monthlySpending || 0;
  const spendingThisMonth = dashboard?.monthlySpending || 0;

  // User guidance based on account state
  const hasCircles = (circles || []).length > 0;
  const hasMembers = (circles || []).some(c => c.memberCount > 1);
  const hasExpenses = (expenses || []).length > 0;
  const hasSettlements = (settlements || []).some(s => s.status === 'completed');

  let guidance = null;
  if (!hasCircles) {
    guidance = {
      icon: Plus,
      title: "Create your first circle",
      message: "Start by creating a circle to track shared expenses with friends, family, or roommates.",
      action: { link: "/app/circles/new", label: "Create Circle" }
    };
  } else if (!hasMembers) {
    guidance = {
      icon: Users,
      title: "Invite members to your circle",
      message: "Add people to your circle so you can start tracking shared expenses together.",
      action: { link: "/app/circles", label: "Invite Members" }
    };
  } else if (!hasExpenses) {
    guidance = {
      icon: DollarSign,
      title: "Add your first expense",
      message: "Start tracking shared expenses. Just type what you spent in plain English.",
      action: { link: "/app/expenses/new", label: "Add Expense" }
    };
  } else if (!hasSettlements) {
    guidance = {
      icon: CheckCircle,
      title: "Complete your first settlement",
      message: "Settle up with your circle members using our optimized payment plans.",
      action: { link: "/app/settlements", label: "View Settlements" }
    };
  }

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading expenses&hellip;
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="border-2 border-vermilion bg-vermilion/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion mb-3">
            Failed to load expenses
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
            I · Ledger
          </div>
          <div className="h-px flex-1 bg-ink" />
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>

        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Your financial <em className="italic">home.</em>
        </h1>
        <p className="mt-5 text-ink-soft max-w-xl text-[15px]">
          Every shared expense, settlement, and balance in one place. See where you stand at a glance.
        </p>
      </div>

      {/* Balance Summary Cards — all values from FinancialEngine */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Net balance</div>
            <Figure
              value={Math.abs(netBalance.netBalance)}
              currency={userCurrency}
              size="xl"
              tone={netBalance.netBalance >= 0 ? "ledger" : "vermilion"}
              signed
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              {netBalance.netBalance >= 0 ? "You're ahead" : "You owe net"}
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Total paid</div>
            <Figure value={netBalance.totalPaid} currency={userCurrency} size="xl" tone="ink" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              By you · all circles
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Total owed to you</div>
            <Figure value={netBalance.owedToYou} currency={userCurrency} size="xl" tone="ledger" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Across all circles
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Total you owe</div>
            <Figure value={netBalance.youOwe} currency={userCurrency} size="xl" tone="vermilion" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Outstanding debts
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Pending settlements</div>
            <div className="font-figure tabular-nums text-4xl text-vermilion">{netBalance.pendingSettlements}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Awaiting completion
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Monthly spending</div>
            <Figure value={netBalance.monthlySpending} currency={userCurrency} size="xl" tone="ink" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              This calendar month
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Open expenses</div>
            <div className="font-figure tabular-nums text-4xl text-ink">{netBalance.openExpenses}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Unsettled entries
            </div>
          </div>

          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Completed settlements</div>
            <div className="font-figure tabular-nums text-4xl text-ledger">{netBalance.completedSettlements}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              All time
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full h-10 pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <select
            value={selectedCircle}
            onChange={(e) => setSelectedCircle(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All circles</option>
            {(circles || []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <Link
            to="/app/expenses/new"
            className="h-10 px-4 inline-flex items-center gap-2 bg-vermilion text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink transition"
          >
            <Plus className="h-3.5 w-3.5" /> Quick Add
          </Link>

          <Link
            to="/app/settlements"
            className="h-10 px-4 inline-flex items-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Settle
          </Link>
        </div>
      </div>

      {/* User Guidance */}
      {guidance && (
        <div className="px-5 md:px-10 lg:px-14 py-6 bg-vermilion/5 border-b border-vermilion/20">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="h-12 w-12 grid place-items-center border-2 border-vermilion bg-vermilion/10 shrink-0">
              <guidance.icon className="h-6 w-6 text-vermilion" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl mb-1">{guidance.title}</h3>
              <p className="text-ink-soft text-sm mb-3">{guidance.message}</p>
              <Link
                to={guidance.action.link}
                className="inline-flex items-center gap-2 h-9 px-4 bg-vermilion text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink transition"
              >
                {guidance.action.label}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="px-5 md:px-10 lg:px-14 py-10 grid lg:grid-cols-[1.5fr_1fr] gap-10">
        {/* Left: Recent Expenses Timeline */}
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-3xl">Recent expenses</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              {filteredExpenses.length} entries
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="border-2 border-dashed border-rule p-16 text-center">
              <div className="font-display text-2xl mb-2">No expenses found</div>
              <p className="text-ink-muted text-sm">Try adjusting your filters or add a new expense.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedByDate.entries()).map(([date, dayExpenses]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                      {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </div>
                    <div className="h-px flex-1 bg-rule" />
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      {formatCurrency(dayExpenses.reduce((s, e) => s + e.amount, 0), userCurrency)}
                    </div>
                  </div>
                  <ol className="space-y-2">
                    {dayExpenses.map(e => {
                      const payer = e.paidBy || {};
                      const group = circles?.find(g => g.id === e.groupId);
                      const yourShare = e.participants?.find(p => p.memberId === engine.currentUserId || p.memberId === engine.currentMemberId)?.share || 0;
                      return (
                        <li key={e.id}>
                          <Link
                            to={`/app/expenses/${e.id}`}
                            className="block border border-ink bg-card p-4 hover:bg-paper-deep/40 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-display text-lg leading-tight">{e.description}</div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <AvatarDot member={payer} size={20} />
                                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                                    {payer.name?.split(" ")[0] || 'A user'} paid
                                  </span>
                                  <span className="text-ink-muted">·</span>
                                  <Pill tone="neutral" className="text-[9px]">{group?.name}</Pill>
                                  <span className="text-ink-muted">·</span>
                                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                                    {e.category}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Figure value={e.amount} currency={e.currency || userCurrency} size="md" tone="ink" />
                                {yourShare > 0 && (
                                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                                     Your share: {formatCurrency(yourShare, e.currency || userCurrency)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="space-y-8">
          {/* Spending This Month */}
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-4">This month</div>
            <Figure value={totalThisMonth} currency={userCurrency} size="xl" tone="ink" />
            <div className="mt-4 space-y-2">
              {categorySpending.map(cat => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{cat.category}</span>
                  <span className="font-mono text-xs">{formatCurrency(cat.amount, userCurrency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outstanding Settlements — from FinancialEngine */}
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-4">Outstanding settlements</div>
            {netBalance.owedToYou > 0 || netBalance.youOwe > 0 ? (
              <div className="space-y-3">
                {netBalance.owedToYou > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-soft">Others owe you</span>
                    <Figure value={netBalance.owedToYou} currency={userCurrency} size="sm" tone="ledger" />
                  </div>
                )}
                {netBalance.youOwe > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-soft">You owe</span>
                    <Figure value={netBalance.youOwe} currency={userCurrency} size="sm" tone="vermilion" />
                  </div>
                )}
                <Link
                  to="/app/settlements"
                  className="mt-4 w-full h-9 inline-flex items-center justify-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
                >
                  View settlement plan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <Stamp className="text-ledger mb-2">All clear</Stamp>
                <p className="text-sm text-ink-muted">No outstanding balances</p>
              </div>
            )}
            {/* Who owes whom — from FinancialEngine */}
            {engine.allRelationships && engine.allRelationships.length > 0 && (
              <div className="mt-4 pt-4 border-t border-rule">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-2">Who owes whom</div>
                {engine.allRelationships.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-dashed border-rule last:border-0">
                    <span className="text-ink-soft">{r.fromName.split(" ")[0]} owes {r.toName.split(" ")[0]}</span>
                    <Figure value={r.amount} currency={r.currency} size="sm" tone="vermilion" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outstanding debt overview — from FinancialEngine */}
          {engine.totalOutstandingDebt > 0 && (
            <div className="border-2 border-vermilion bg-vermilion/5 p-6">
              <div className="eyebrow mb-2">Total outstanding debt</div>
              <Figure value={engine.totalOutstandingDebt} currency={userCurrency} size="xl" tone="vermilion" />
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-2">
                {engine.allSettlementSuggestions.suggestions.length} pending settlements
              </div>
              <Link
                to="/app/settlements"
                className="mt-3 w-full h-8 inline-flex items-center justify-center gap-2 bg-vermilion text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition"
              >
                Settle now
              </Link>
            </div>
          )}

          {/* Recent Circle Activity */}
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-4">Your circles</div>
            <div className="space-y-3">
              {(circles || []).slice(0, 4).map(g => (
                <Link
                  key={g.id}
                  to={`/app/circles/${g.id}`}
                  className="flex items-start justify-between gap-3 p-3 border border-rule hover:border-ink hover:bg-paper-deep/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base leading-tight">{g.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                      {formatCurrency(g.totalSpent || 0, g.currency || userCurrency)} total
                    </div>
                  </div>
                  <Figure
                    value={g.yourBalance || 0}
                    currency={g.currency || userCurrency}
                    size="xs"
                    signed
                    tone={(g.yourBalance || 0) >= 0 ? "ledger" : "vermilion"}
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-2 border-dashed border-rule p-6">
            <div className="eyebrow mb-4">Quick actions</div>
            <div className="space-y-2">
              <Link
                to="/app/expenses/new"
                className="flex items-center gap-3 p-3 border border-ink hover:bg-ink hover:text-paper transition"
              >
                <Plus className="h-4 w-4" />
                <div>
                  <div className="font-display text-sm">New expense</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                    File an entry
                  </div>
                </div>
              </Link>
              <Link
                to="/app/circles/new"
                className="flex items-center gap-3 p-3 border border-ink hover:bg-ink hover:text-paper transition"
              >
                <Plus className="h-4 w-4" />
                <div>
                  <div className="font-display text-sm">New circle</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                    Start a group
                  </div>
                </div>
              </Link>
              <Link
                to="/app/search"
                className="flex items-center gap-3 p-3 border border-ink hover:bg-ink hover:text-paper transition"
              >
                <Search className="h-4 w-4" />
                <div>
                  <div className="font-display text-sm">Search</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                    Find anything
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}