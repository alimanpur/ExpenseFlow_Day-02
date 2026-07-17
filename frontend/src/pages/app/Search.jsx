import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AvatarDot, Figure } from "../../components/ui/Primitives";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { useFinancialEngine } from "../../services/financial.engine";
import { globalSearch } from "../../services/search.service";
import { getUserCircles } from "../../services/circle.service";

export default function Search() {
  const [q, setQ] = useState("");
  const engine = useFinancialEngine();

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => globalSearch(q, { limit: 20 }),
    enabled: q.length > 1,
  });

  const { data: circlesResult, isLoading: circlesLoading } = useQuery({
    queryKey: ['circles'],
    queryFn: () => getUserCircles(engine.currentUserId),
  });

  const circles = circlesResult?.circles || [];
  const searchQuery = q;

  const isLoading = searchLoading || circlesLoading;

  // Map backend results to frontend format
  const mappedResults = useMemo(() => {
    const results = searchData?.results || { entries: [], circles: [], people: [] };
    if (!results) return { entries: [], circles: [], people: [] };
    
    return {
      entries: (results.entries || []).map(e => ({
        id: e._id || e.id,
        description: e.title || e.description || '',
        category: e.category || 'Other',
        amount: e.amount || 0,
        currency: e.currency,
        date: e.date || e.createdAt ? new Date(e.date || e.createdAt).toISOString().split('T')[0] : '',
        circleId: e.circleId || e.groupId,
      })),
      circles: (results.circles || []).map(c => ({
        id: c._id || c.id,
        name: c.name,
        description: c.description || '',
      })),
      people: (results.people || []).map(p => ({
        id: p._id || p.id,
        name: p.name,
        handle: p.email || p.handle || '',
        initials: p.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??',
      })),
    };
  }, [searchData]);

  const handleClear = () => setQ("");
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setQ('');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div data-tour="search" className="min-h-[calc(100vh-88px)] px-5 md:px-10 lg:px-14 pt-14">
      <div className="max-w-3xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted text-center mb-3">
          Card catalog
        </div>
        <div className="border-2 border-ink bg-card flex items-center gap-4 px-5">
          <SearchIcon className="h-5 w-5" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search entries, circles, people…"
            className="flex-1 py-5 bg-transparent font-display text-2xl placeholder:text-ink-muted/50 focus:outline-none"
          />
          {q && (
            <button onClick={handleClear} className="flex items-center justify-center">
              <X className="h-4 w-4 text-ink-muted" />
            </button>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted border border-rule px-2 py-1 hidden md:block">esc</span>
        </div>

        {!searchQuery && !q && (
          <p className="mt-10 text-center font-display text-2xl italic text-ink-muted">
            Type a few letters. Cards will surface.
          </p>
        )}

        {isLoading && searchQuery && (
          <div className="mt-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
          </div>
        )}

        {searchQuery && !isLoading && (
          <div className="mt-10 space-y-10">
            <Section title="Entries" count={mappedResults.entries.length}>
              {mappedResults.entries.map((e) => (
                <Link key={e.id} to={`/app/expenses/${e.id}`} className="block py-3 border-b border-rule flex items-center justify-between gap-4 hover:bg-paper-deep/40 px-2 -mx-2">
                  <div>
                    <div className="font-display text-lg">{e.description}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{e.category} · {e.date}</div>
                  </div>
                  <Figure value={e.amount} currency={e.currency || engine.userCurrency} size="sm" />
                </Link>
              ))}
            </Section>
            <Section title="Circles" count={mappedResults.circles.length}>
              {mappedResults.circles.map((g) => (
                <Link key={g.id} to={`/app/circles/${g.id}`} className="block py-3 border-b border-rule hover:bg-paper-deep/40 px-2 -mx-2">
                  <div className="font-display text-lg">{g.name}</div>
                  <div className="text-sm text-ink-muted italic">{g.description}</div>
                </Link>
              ))}
            </Section>
            <Section title="People" count={mappedResults.people.length}>
              {mappedResults.people.map((m) => (
                <div key={m.id} className="py-3 border-b border-rule flex items-center gap-3">
                  <AvatarDot member={m} size={28} />
                  <div>
                    <div className="font-display text-lg">{m.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{m.handle}</div>
                  </div>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-ink pb-2 mb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">{count} hits</span>
      </div>
      {count === 0 ? <p className="text-ink-muted italic text-sm">No matches.</p> : <div>{children}</div>}
    </section>
  );
}