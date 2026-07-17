import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { AvatarDot, AvatarStack } from "../ui/Primitives";
import { cn } from "../../utils/utils";
import { useAuth } from "../../hooks/useAuth";
import { useFinancialEngine } from "../../services/financial.engine";
import { formatCurrency } from "../../services/currency.service";
import { Plus, Menu, X, ChevronDown, UserPlus, Settings, Bell, User, HelpCircle, Archive } from "lucide-react";
import AddMemberModal from "../forms/AddMemberModal";
import { socketService } from "../../services/socket.service";

const tabs = [
  { to: "/app/ledger", label: "Ledger", folio: "I", exact: true, tourId: "ledger" },
  { to: "/app/entries", label: "Entries", folio: "II", tourId: "entries" },
  { to: "/app/people", label: "People", folio: "III", tourId: "people" },
  { to: "/app/circles", label: "Circles", folio: "IV", tourId: "circles" },
];

  const drawerLinks = [
    { to: "/app/settings", label: "Settings", icon: Settings, tourId: "settings" },
    { to: "/app/notifications", label: "Pings", icon: Bell, tourId: "notifications" },
    { to: "/app/profile", label: "Profile", icon: User },
    { to: "/app/archive", label: "Archive", icon: Archive },
    { to: "/app/help", label: "Help", icon: HelpCircle, tourId: "finish" },
  ];

export default function AppShell() {
  const location = useLocation();
  const [mobileTabs, setMobileTabs] = useState(false);
  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return <LedgerShell />;
}

export function LedgerShell() {
  const location = useLocation();
  const [mobileTabs, setMobileTabs] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  const { user } = useAuth();
  const engine = useFinancialEngine();

  // Determine the currently active circle
  const activeCircleId = useMemo(() => {
    const circleDetailMatch = location.pathname.match(/\/app\/circles\/([^/]+)/);
    if (circleDetailMatch) return circleDetailMatch[1];
    return engine?.circles?.[0]?.id || null;
  }, [location.pathname, engine.circles]);

  // Members of the active circle
  const activeCircle = useMemo(
    () => engine?.circles?.find((c) => c.id === activeCircleId) || engine?.circles?.[0] || null,
    [engine.circles, activeCircleId]
  );
  const circleMembers = useMemo(() => {
    if (!activeCircle?.members) return [];
    return activeCircle.members.filter((m) => m.isActive !== false);
  }, [activeCircle]);

  // Financial data from FinancialEngine
  const net = engine.dashboard?.netBalance || 0;
  const owedToYou = engine.dashboard?.totalOwedToYou || 0;
  const youOwe = engine.dashboard?.totalYouOwe || 0;
  const openEntries = engine.dashboard?.openExpenses || 0;
  const pendingSettlements = engine.dashboard?.pendingSettlements || 0;
  const completedSettlements = engine.dashboard?.completedSettlements || 0;
  const circleCount = engine.dashboard?.totalCircles || engine.circles?.length || 0;

   // Socket synchronization with financial engine
   useEffect(() => {
     const handleSocketEvent = (eventName, data) => {
       let actionType = null;
       let circleId = null;

       // Map socket event to action type
       const eventMap = {
         'expense:created': 'EXPENSE_CREATED',
         'expense:updated': 'EXPENSE_EDITED',
         'expense:deleted': 'EXPENSE_DELETED',
         'expense:restored': 'EXPENSE_CREATED', // treat as created
         'settlement:created': 'SETTLEMENT_SUGGESTED',
         'settlement:confirmed': 'SETTLEMENT_CONFIRMED',
         'settlement:completed': 'SETTLEMENT_COMPLETED',
         'settlement:cancelled': 'SETTLEMENT_CANCELLED',
         'member:added': 'MEMBER_ADDED',
         'member:removed': 'MEMBER_REMOVED',
         'circle:updated': 'CIRCLE_UPDATED',
         'circle:archived': 'CIRCLE_ARCHIVED',
       };

       if (eventMap[eventName]) {
         actionType = eventMap[eventName];
         // Try to extract circleId from data
         if (data) {
           if (data.circleId) {
             circleId = data.circleId;
           } else if (data.expense && data.expense.circleId) {
             circleId = data.expense.circleId;
           } else if (data.settlement && data.settlement.circleId) {
             circleId = data.settlement.circleId;
           } else if (data.member && data.member.circleId) {
             circleId = data.member.circleId;
           } else if (data.circle && data.circle.id) {
             circleId = data.circle.id;
           }
         }
         // If we have an actionType, use the financial engine's refreshAfterAction
         if (actionType) {
           engine.refreshAfterAction(actionType, circleId);
         }
       } else {
         // Handle events without a direct action type
         switch (eventName) {
           case 'notification:new':
             engine.queryClient.invalidateQueries({ queryKey: ['notifications'] });
             engine.queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
             break;
           case 'activity:new':
             engine.queryClient.invalidateQueries({ queryKey: ['activity'] });
             break;
           default:
             console.warn(`Unhandled socket event: ${eventName}`);
         }
       }
     };

     // Subscribe to socket events
     const events = [
       'expense:created',
       'expense:updated',
       'expense:deleted',
       'expense:restored',
       'settlement:created',
       'settlement:confirmed',
       'settlement:completed',
       'settlement:cancelled',
       'member:added',
       'member:removed',
       'circle:updated',
       'circle:archived',
       'notification:new',
       'activity:new',
     ];

     const handlers = {};
     events.forEach(event => {
       const handler = (data) => handleSocketEvent(event, data);
       socketService.on(event, handler);
       handlers[event] = handler;
     });

     // Cleanup
     return () => {
       Object.keys(handlers).forEach(event => {
         socketService.off(event, handlers[event]);
       });
     };
   }, [engine]);

   // Get current date
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const nameHue = (name) => {
    if (!name) return 0;
    return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink">
        <div className="h-14 pl-3 pr-3 md:pl-6 md:pr-5 flex items-center gap-4">
          <button
            onClick={() => setMobileTabs(!mobileTabs)}
            className="lg:hidden h-8 w-8 grid place-items-center border border-ink"
            aria-label="Folios"
          >
            {mobileTabs ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/" className="flex items-baseline gap-2 shrink-0 my-1">
            <span className="font-display text-xl leading-none mr-10">ExpenseFlow</span>
          </Link>

          {/* Dynamic Circle Member Navigation */}
          <div className="hidden md:flex items-center gap-2 px-4 border-x border-rule h-full">
            <span className="eyebrow shrink-0">Circle</span>
            <div className="flex items-center gap-1">
              {activeCircle ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowMemberMenu(!showMemberMenu)}
                      className="flex items-center gap-1 hover:opacity-70 transition"
                      title={activeCircle.name}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] max-w-[100px] truncate">
                        {activeCircle.name}
                      </span>
                      <ChevronDown className="h-3 w-3 text-ink-muted" />
                    </button>
                    {showMemberMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMemberMenu(false)} />
                        <div className="absolute top-full left-0 mt-2 w-64 bg-paper border-2 border-ink shadow-lg z-50 py-2">
                          <div className="px-3 py-2 border-b border-rule">
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                              {(circleMembers || []).length} members
                            </span>
                          </div>
                  {(circleMembers || []).map((m) => {
                    const memberUser = m.user || m;
                    const name = memberUser.name || m.displayName || 'Guest';
                    const isOwner = m.role === 'owner';
                    const isGuest = m.isGuest;
                    const memberId = memberUser._id || m._id;
                    const memberHue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                    // Balance from FinancialEngine's circle data (not local m.netBalance)
                    const balance = m.yourBalance || m.netBalance || 0;
                    return (
                      <div
                        key={memberId}
                        className="px-3 py-2 flex items-center gap-3 hover:bg-paper-deep transition"
                      >
                        <span
                          className="inline-flex items-center justify-center text-[9px] font-mono font-medium rounded-full shrink-0"
                          style={{
                            width: 28,
                            height: 28,
                            background: `oklch(0.94 0.04 ${memberHue})`,
                            color: `oklch(0.30 0.10 ${memberHue})`,
                          }}
                        >
                          {getInitials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-sm truncate flex items-center gap-2">
                            {name}
                            {isOwner && <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-ledger">Owner</span>}
                            {isGuest && <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-ink-muted">Guest</span>}
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted flex items-center gap-2">
                            {m.role}
                            {balance !== 0 && (
                              <span className={balance > 0 ? "text-ledger" : "text-vermilion"}>
                                {balance > 0 ? `+` : `−`}{formatCurrency(Math.abs(balance), activeCircle?.currency || 'USD', { useLargeNumberFormat: true, showSymbol: false })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                          <div className="mt-1 pt-2 border-t border-rule px-3">
                            <button
                              onClick={() => {
                                setShowMemberMenu(false);
                                setSelectedCircleId(activeCircle.id);
                                setShowAddMember(true);
                              }}
                              className="w-full text-left px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep flex items-center gap-2 text-vermilion"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Add member
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <AvatarStack members={(circleMembers || []).map((m) => {
                    const u = m.user || m;
                    const name = u.name || m.displayName || 'Guest';
                    return {
                      id: u._id || m._id,
                      name,
                      initials: getInitials(name),
                      hue: name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360,
                    };
                  })} size={22} max={5} />
                </>
              ) : (
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-[0.16em]">No circle selected</span>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <Link to="/app/ledger" className="hidden md:flex items-baseline gap-2 mr-2 group">
            <span className="eyebrow">Net</span>
            <span className={cn("font-figure text-base", net >= 0 ? "text-ledger" : "text-vermilion")}>
              {net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(net), engine.userCurrency, { useLargeNumberFormat: true, showSymbol: false })}
            </span>
          </Link>

          <Link
            to="/app/expenses/new"
            data-tour="new-expense"
            className="h-8 px-3 inline-flex items-center gap-2 bg-vermilion text-paper text-[12px] font-mono uppercase tracking-[0.16em] hover:bg-ink transition"
          >
            <Plus className="h-3.5 w-3.5" /> Entry
          </Link>

          <Link to="/app/profile" className="hidden md:block ml-1">
            {user && <AvatarDot member={{ id: user._id, name: user.name, initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase(), hue: 36 }} size={34} />}
          </Link>
        </div>

        {/* Date Display */}
        <div className="hidden md:block border-t border-rule px-6 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            {currentDate}
          </div>
        </div>

        {/* Enhanced Financial Strip */}
        <div className="hidden md:grid grid-cols-3 border-t border-rule font-mono text-[11px]">
          <div className="px-6 py-1.5 border-r border-rule flex justify-between items-center">
            <span className="text-ink-muted uppercase tracking-[0.18em]">Owed to you</span>
            <span className="text-ledger">{formatCurrency(owedToYou, engine.userCurrency, { useLargeNumberFormat: true })}</span>
          </div>
          <div className="px-6 py-1.5 border-r border-rule flex justify-between items-center">
            <span className="text-ink-muted uppercase tracking-[0.18em]">You owe</span>
            <span className="text-vermilion">{formatCurrency(youOwe, engine.userCurrency, { useLargeNumberFormat: true })}</span>
          </div>
          <div className="px-6 py-1.5 flex justify-between items-center">
            <span className="text-ink-muted uppercase tracking-[0.18em]">Circles</span>
            <span>{circleCount} {circleCount === 1 ? 'circle' : 'circles'}</span>
          </div>
        </div>
      </header>

        <div className="flex">
          <aside
            data-tour="sidebar"
            className={cn(
              "z-30 bg-paper border-r border-ink",
              "fixed inset-y-14 left-0 w-44 lg:static lg:w-16 lg:shrink-0",
              mobileTabs ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
              "transition-transform"
            )}
          >
          <nav className="h-full flex flex-col">
            {tabs.map((t) => {
              const active = isActive(t.to, t.exact);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => setMobileTabs(false)}
                  data-tour={t.tourId || undefined}
                  className={cn(
                    "group relative flex lg:flex-col items-center lg:justify-end lg:py-6",
                    "px-4 lg:px-0 py-3 border-b border-rule",
                    "transition-colors",
                    active ? "bg-ink text-paper" : "hover:bg-paper-deep text-ink"
                  )}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60 lg:writing-vertical">
                    {t.folio}
                  </span>
                  <span
                    className={cn(
                      "ml-3 lg:ml-0 lg:mt-3 font-display text-2xl lg:text-xl",
                      "lg:[writing-mode:vertical-rl] lg:rotate-180"
                    )}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <span className="hidden lg:block absolute left-0 top-0 bottom-0 w-[3px] bg-vermilion" />
                  )}
                </Link>
              );
            })}
            <div className="mt-auto hidden lg:flex flex-col items-center py-4 gap-4 border-t border-rule">
              {drawerLinks.map((d) => {
                const Icon = d.icon;
                return (
                  <Link
                    key={d.to}
                    to={d.to}
                    title={d.label}
                    data-tour={d.tourId || undefined}
                    className="text-ink-muted hover:text-ink transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
            <div className="lg:hidden border-t border-rule">
              {drawerLinks.map((d) => {
                const Icon = d.icon;
                return (
                  <Link
                    key={d.to}
                    to={d.to}
                    onClick={() => setMobileTabs(false)}
                    data-tour={d.tourId || undefined}
                    className="px-4 py-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft border-b border-rule"
                  >
                    <Icon className="h-4 w-4 opacity-50" />
                    {d.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {mobileTabs && (
          <div
            className="fixed inset-0 top-14 z-20 bg-ink/30 lg:hidden"
            onClick={() => setMobileTabs(false)}
          />
        )}

        <main className="flex-1 min-w-0 page-turn" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Add Member Modal */}
      {showAddMember && selectedCircleId && (
        <AddMemberModal
          circleId={selectedCircleId}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            engine.refreshAfterAction("MEMBER_ADDED", selectedCircleId);
          }}
        />
      )}
    </div>
  );
}

// PageHeader — printed as a folio masthead, not a SaaS title bar.
export function PageHeader({
  folio,
  title,
  description,
  actions,
}) {
  return (
    <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-6">
      {folio && (
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-ink" />
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
            {folio}
          </div>
          <div className="h-px w-12 bg-ink" />
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 items-end">
        <div className="min-w-0">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.92] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-5 text-ink-soft max-w-xl text-[15px] leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-8 h-px w-full bg-ink" />
      <div className="h-px w-full bg-ink mt-0.75" />
    </div>
  );
}

// Margin rail — used by pages that want a right-edge column.
export function MarginRail({ children, className }) {
  return (
    <aside className={cn("hidden xl:block w-70 shrink-0 border-l border-rule p-6 sticky top-22 self-start max-h-[calc(100vh-88px)] overflow-y-auto", className)}>
      {children}
    </aside>
  );
}
