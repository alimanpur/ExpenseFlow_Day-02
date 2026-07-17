import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AvatarStack, Figure, Stamp, Pill } from "../components/ui/Primitives";
import { archiveCircle, deleteCircle } from "../services/circle.service";
import { useFinancialEngine, QUERY_KEYS } from "../services/financial.engine";
import { Plus, ArrowUpRight, Search, Grid, List, AlertCircle, RefreshCw, MoreVertical, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";

const categoryColor = {
  travel: "bg-vermilion",
  household: "bg-ledger",
  couple: "bg-ink",
  family: "bg-vermilion",
  club: "bg-ledger",
  event: "bg-ink",
};

export default function Circles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("activity");
  const [viewMode, setViewMode] = useState("grid");
  const [openMenuId, setOpenMenuId] = useState(null);
  const queryClient = useQueryClient();

  // Use FinancialEngine for circles data
  const engine = useFinancialEngine();
  const circles = engine.circles;

  const archiveMutation = useMutation({
    mutationFn: ({ circleId, archive }) => archiveCircle(circleId, archive),
    onSuccess: () => {
      engine.refreshAfterAction('CIRCLE_UPDATED');
      toast.success("Circle updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update circle"),
  });

  const deleteMutation = useMutation({
    mutationFn: (circleId) => deleteCircle(circleId),
    onSuccess: () => {
      engine.refreshAfterAction('CIRCLE_DELETED');
      toast.success("Circle deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete circle"),
  });

  const handleArchive = (circleId, currentArchiveStatus) => {
    archiveMutation.mutate({ circleId, archive: !currentArchiveStatus });
    setOpenMenuId(null);
  };

  const handleDelete = (circleId) => {
    if (!confirm("Delete this circle permanently? This cannot be undone.")) return;
    deleteMutation.mutate(circleId);
    setOpenMenuId(null);
  };

  const circlesDataEnriched = useMemo(() => {
    return (circles || []).map((c) => ({
      ...c,
      categories: c.category ? [c.category] : [],
    }));
  }, [circles]);

  const filteredCircles = useMemo(() => {
    let filtered = circlesDataEnriched;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "amount":
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case "balance":
          return Math.abs(b.yourBalance || 0) - Math.abs(a.yourBalance || 0);
        case "activity":
        default:
          return (b.lastActivity || '').localeCompare(a.lastActivity || '');
      }
    });

    return filtered;
  }, [circlesDataEnriched, searchQuery, sortBy]);

  const getCategoryClass = (cat) => categoryColor[cat] || "bg-ink";

  // Loading state from FinancialEngine
  if (engine.isLoading) {
    return (
      <div>
        <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
          <div className="flex items-center gap-3 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
              Folio III · Circles
            </div>
            <div className="h-px flex-1 bg-ink" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
            Every shared <em className="italic">pocket.</em>
          </h1>
        </div>
        <div className="px-5 md:px-10 lg:px-14 py-12">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-ink bg-card p-6 animate-pulse">
                <div className="h-4 bg-paper-deep rounded w-1/3 mb-4" />
                <div className="h-8 bg-paper-deep rounded w-2/3 mb-4" />
                <div className="h-4 bg-paper-deep rounded w-1/2 mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-paper-deep rounded" />
                  <div className="h-12 bg-paper-deep rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (engine.isError) {
    return (
      <div>
        <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
          <div className="flex items-center gap-3 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
              III · Circles
            </div>
            <div className="h-px flex-1 bg-ink" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
            Every shared <em className="italic">pocket.</em>
          </h1>
        </div>
        <div className="px-5 md:px-10 lg:px-14 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-vermilion mx-auto mb-4" />
          <div className="font-display text-3xl mb-3">Failed to load circles</div>
          <p className="text-ink-muted mb-6">An error occurred</p>
          <button
            onClick={() => engine.refreshAfterAction('CIRCLE_CREATED')}
            className="h-10 px-4 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
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
          </div>
          <div className="h-px flex-1 bg-ink" />
          <Link
            to="/app/circles/new"
            data-tour="new-circle"
            className="h-8 px-3 inline-flex items-center gap-2 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition"
          >
            <Plus className="h-3.5 w-3.5" /> New circle
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
              Every shared <em className="italic">pocket.</em>
            </h1>
            <p className="mt-5 text-ink-soft text-[15px] leading-relaxed">
              A circle is a closed ledger between a fixed set of people — a trip,
              an apartment, a couple's joint account. Open one to scrub its
              timeline, settle its balances, or close it for the season.
            </p>
          </div>
          <div className="flex gap-3 justify-end text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              {filteredCircles.length} {filteredCircles.length === 1 ? "circle" : "circles"}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setViewMode("grid")}
                className={`h-9 w-9 inline-flex items-center justify-center border-2 ${viewMode === "grid" ? "border-ink bg-ink text-paper" : "border-rule"} transition`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`h-9 w-9 inline-flex items-center justify-center border-2 ${viewMode === "list" ? "border-ink bg-ink text-paper" : "border-rule"} transition`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circles..."
              className="w-full h-10 pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="activity">Sort by activity</option>
            <option value="name">Sort by name</option>
            <option value="amount">Sort by amount</option>
            <option value="balance">Sort by balance</option>
          </select>
        </div>
      </div>

      {/* Circles Grid/List */}
      <div className="px-5 md:px-10 lg:px-14 py-12">
        {filteredCircles.length === 0 ? (
          <div className="py-20 text-center">
            <div className="font-display text-3xl mb-3">No circles found</div>
            <p className="text-ink-muted mb-6">Try adjusting your search or create a new circle.</p>
            <Link
              to="/app/circles/new"
              className="inline-flex items-center gap-2 h-10 px-4 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first circle
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <ol className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
            {filteredCircles.map((g, i) => {
              const owed = (g.yourBalance || 0) >= 0;
              return (
                <li key={g.id} className="group">
                  <Link to={`/app/circles/${g.id}`} className="block">
                    <article className="relative bg-card border border-ink shadow-[6px_6px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_var(--color-ink)] transition-all h-full">
                      <div className="absolute -top-3 left-6 flex items-center gap-1">
                        <span className={"h-6 px-3 inline-flex items-center font-mono text-[10px] tracking-[0.2em] uppercase text-paper " + getCategoryClass(g.category)}>
                          {g.category || 'circle'}
                        </span>
                        <span className="h-6 px-2 inline-flex items-center font-mono text-[10px] tracking-[0.2em] uppercase bg-paper border border-ink">
                          {g.currency}
                        </span>
                      </div>

                      <div className="pt-8 pb-6 px-6">
                        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-muted">
                          Circle № {String(i + 1).padStart(2, "0")}
                        </div>
                        <h3 className="font-display text-3xl mt-2 leading-tight">{g.name}</h3>
                        <p className="text-sm text-ink-soft mt-2 italic">{g.description || ''}</p>
                      </div>

                      <div className="px-6 py-5 border-t border-ink grid grid-cols-2 gap-4">
                        <div>
                          <div className="eyebrow mb-2">Total spent</div>
                          <Figure value={g.totalSpent} currency={g.currency} size="md" tone="ink" />
                        </div>
                        <div>
                          <div className="eyebrow mb-2">{owed ? "Owed to you" : "You owe"}</div>
                          <Figure
                            value={Math.abs(g.yourBalance || 0)}
                            currency={g.currency}
                            size="md"
                            tone={owed ? "ledger" : "vermilion"}
                          />
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-rule">
                        <div className="flex items-center justify-between mb-2">
                          <div className="eyebrow text-[9px]">Categories</div>
                          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                            {g.categories.length} {g.categories.length === 1 ? "type" : "types"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.categories.slice(0, 3).map((cat) => (
                            <span key={cat} className="px-2 py-0.5 border border-rule font-mono text-[9px] uppercase tracking-[0.12em]">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-rule flex items-center justify-between">
                        <AvatarStack members={g.members} size={24} max={5} />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted inline-flex items-center gap-1">
                            {g.expenseCount} entries <ArrowUpRight className="h-3 w-3" />
                          </span>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === g.id ? null : g.id); }}
                              className="h-7 w-7 border border-rule grid place-items-center hover:border-ink transition"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {openMenuId === g.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-paper border-2 border-ink shadow-lg z-10">
                                <button
                                  onClick={(e) => { e.preventDefault(); handleArchive(g.id, g.isArchived); }}
                                  className="w-full text-left px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-paper-deep border-b border-rule flex items-center gap-2"
                                >
                                  <Archive className="h-3.5 w-3.5" /> {g.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); handleDelete(g.id); }}
                                  className="w-full text-left px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-vermilion hover:bg-vermilion/10 flex items-center gap-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {g.isArchived && (
                        <span className="absolute top-4 right-4">
                          <Stamp className="text-ink-muted">Archived</Stamp>
                        </span>
                      )}
                    </article>
                  </Link>
                </li>
              );
            })}

            <li>
              <Link
                to="/app/circles/new"
                className="block border-2 border-dashed border-rule-bold h-full min-h-[280px] grid place-items-center text-center p-8 hover:bg-paper-deep/40 transition"
              >
                <div>
                  <div className="h-12 w-12 mx-auto grid place-items-center border-2 border-ink">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="font-display text-2xl mt-5">Open a new circle</div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mt-2">
                    trip · house · crew · event
                  </div>
                </div>
              </Link>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3">
            {filteredCircles.map((g, i) => {
              const owed = (g.yourBalance || 0) >= 0;
              return (
                <li key={g.id}>
                  <Link to={`/app/circles/${g.id}`} className="block border border-ink bg-card p-6 hover:bg-paper-deep/40 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={"h-5 px-2 inline-flex items-center font-mono text-[9px] tracking-[0.18em] uppercase text-paper " + getCategoryClass(g.category)}>
                            {g.category || 'circle'}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                            {g.currency}
                          </span>
                        </div>
                        <h3 className="font-display text-2xl leading-tight mb-1">{g.name}</h3>
                        <p className="text-sm text-ink-soft italic mb-3">{g.description || ''}</p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <AvatarStack members={g.members} size={20} max={4} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                            {g.memberCount} members · {g.expenseCount} entries
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="eyebrow text-[9px] mb-1">{owed ? "Owed to you" : "You owe"}</div>
                        <Figure
                          value={Math.abs(g.yourBalance || 0)}
                          currency={g.currency}
                          size="lg"
                          tone={owed ? "ledger" : "vermilion"}
                        />
                        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-2">
                          {g.lastActivity}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}

            <li>
              <Link
                to="/app/circles/new"
                className="block border-2 border-dashed border-rule-bold p-8 text-center hover:bg-paper-deep/40 transition"
              >
                <div className="inline-flex items-center gap-2 h-10 px-4 border-2 border-ink">
                  <Plus className="h-4 w-4" />
                  <span className="font-display text-lg">Create new circle</span>
                </div>
              </Link>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}