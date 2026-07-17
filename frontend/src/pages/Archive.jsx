import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AvatarDot, Figure, Pill, Stamp } from "../components/ui/Primitives";
import { Search, Filter, Download, Trash2, RotateCcw, Calendar, X, Loader2 } from "lucide-react";
import { getArchivedExpenses, restoreExpense, permanentlyDeleteExpense } from "../services/archive.service";
import { getUserCircles } from "../services/circle.service";
import { useFinancialEngine } from "../services/financial.engine";
import { formatCurrency } from "../services/currency.service";
import { toast } from "sonner";

export default function Archive() {
  const engine = useFinancialEngine();
  const userCurrency = engine.userCurrency;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCircle, setSelectedCircle] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [restoringId, setRestoringId] = useState(null);

  const { data: archiveData, isLoading: archiveLoading } = useQuery({
    queryKey: ['archive', selectedCircle],
    queryFn: () => getArchivedExpenses({ 
      limit: 200, 
      ...(selectedCircle !== 'all' && { circleId: selectedCircle }) 
    }),
  });

  const { data: circlesResult, isLoading: circlesLoading } = useQuery({
    queryKey: ['circles'],
    queryFn: () => getUserCircles(engine.currentUserId),
  });

  const expenses = useMemo(() => archiveData?.expenses || [], [archiveData]);
  const isLoading = archiveLoading || circlesLoading;
  const circles = circlesResult?.circles || [];

  // Group expenses by month
  const months = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
    const monthMap = new Map();
    
    sorted.forEach(e => {
      const key = e.date.slice(0, 7);
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key).push(e);
    });

    return Array.from(monthMap.entries()).map(([month, items]) => ({
      month,
      items,
      total: items.reduce((s, e) => s + e.amount, 0)
    }));
  }, [expenses]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(expenses.map(e => e.category))];
    return cats.sort();
  }, [expenses]);

  // Filter expenses
  const filteredMonths = useMemo(() => {
    if (selectedMonth === "all" && selectedCategory === "all" && selectedCircle === "all" && !searchQuery) {
      return months;
    }

    return months.map(monthData => {
      let filtered = monthData.items;
      
      if (selectedCategory !== "all") {
        filtered = filtered.filter(e => e.category === selectedCategory);
      }
      
      if (selectedCircle !== "all") {
        filtered = filtered.filter(e => e.groupId === selectedCircle || e.circleId === selectedCircle);
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(e => 
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.groupName && e.groupName.toLowerCase().includes(q))
        );
      }

      return {
        ...monthData,
        items: filtered,
        total: filtered.reduce((s, e) => s + e.amount, 0)
      };
    }).filter(m => m.items.length > 0);
  }, [months, selectedMonth, selectedCategory, selectedCircle, searchQuery]);

  const totalEntries = filteredMonths.reduce((s, m) => s + m.items.length, 0);
  const totalAmount = filteredMonths.reduce((s, m) => s + m.total, 0);

  const handleRestore = async (expenseId) => {
    setRestoringId(expenseId);
    try {
      await restoreExpense(expenseId);
      toast.success("Expense restored");
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    } catch (error) {
      toast.error("Failed to restore expense");
    } finally {
      setRestoringId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 pb-8">
        <div className="animate-pulse">
          <div className="h-8 bg-paper-deep rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-paper-deep rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-paper-deep rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="flex items-center gap-3 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
          V · Archive
          </div>
          <div className="h-px flex-1 bg-ink" />
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            {totalEntries} {totalEntries === 1 ? "entry" : "entries"} on record · {formatCurrency(totalAmount, userCurrency)}
          </div>
        </div>

        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Every entry, <em className="italic">indexed.</em>
        </h1>
        <p className="mt-5 text-ink-soft max-w-xl text-[15px]">
          The complete archive across every circle, filed by month. Scrub
          decades of shared money in one continuous column.
        </p>
      </section>

      {/* Filters */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the archive..."
              className="w-full h-10 pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <select
            value={selectedCircle}
            onChange={(e) => setSelectedCircle(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All circles</option>
            {circles.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All months</option>
            {months.map(m => (
              <option key={m.month} value={m.month}>
                {new Date(m.month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button className="h-10 px-3 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Archive Content */}
      <div className="px-5 md:px-10 lg:px-14 py-10">
        {filteredMonths.length === 0 ? (
          <div className="py-20 text-center">
            <div className="font-display text-3xl mb-3">No archived entries</div>
            <p className="text-ink-muted">Archived expenses will appear here. Start by adding expenses to your circles.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-12">
            {filteredMonths.map(({ month, items, total }) => (
              <section key={month}>
                <header className="flex items-baseline justify-between border-b border-ink pb-3 mb-3">
                  <h2 className="font-display text-3xl">
                    {new Date(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </h2>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                    {items.length} {items.length === 1 ? "entry" : "entries"} · Σ {formatCurrency(total, userCurrency)}
                  </div>
                </header>
                <ol className="divide-y divide-rule">
                  {items.map((e) => {
                    const restoring = restoringId === e.id;
                    return (
                      <li key={e.id} className="group">
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-4 md:gap-6 items-center py-4 px-2 hover:bg-paper-deep/40 transition">
                          <Link
                            to={`/app/expenses/${e.id}`}
                            className="contents"
                          >
                            <span className="font-mono text-[10px] tabular-nums text-ink-muted w-12">
                              {e.date.slice(8)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-display text-lg leading-tight truncate">{e.description}</div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                                <span>{e.groupName}</span>
                                <span>·</span>
                                <span>{e.category}</span>
                              </div>
                            </div>
                            <Figure value={e.amount} currency={e.currency || userCurrency} size="md" tone="ink" />
                            <div className="hidden md:block w-24 text-right">
                            </div>
                          </Link>
                          <button
                            onClick={() => handleRestore(e.id)}
                            disabled={restoring}
                            className="hidden md:flex h-8 w-8 items-center justify-center border border-ink hover:bg-ink hover:text-paper transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Restore expense"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMonths.map(({ month, items }) => (
              <React.Fragment key={month}>
                {items.map(e => (
                  <div key={e.id} className="group relative">
                    <Link
                      to={`/app/expenses/${e.id}`}
                      className="block border border-ink bg-card p-5 hover:bg-paper-deep/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <Pill tone="neutral" className="text-[9px]">
                          {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Pill>
                        <Figure value={e.amount} currency={e.currency || userCurrency} size="xs" />
                      </div>
                      <div className="font-display text-lg leading-tight mb-2">{e.description}</div>
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                        <span>{e.category}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-rule">
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                          {e.groupName}
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={(ev) => { ev.preventDefault(); handleRestore(e.id); }}
                      disabled={restoringId === e.id}
                      className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center border border-ink bg-paper hover:bg-ink hover:text-paper transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Restore expense"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
