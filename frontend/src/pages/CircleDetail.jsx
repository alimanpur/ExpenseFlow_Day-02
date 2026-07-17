import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarDot, AvatarStack, Figure, Pill, Stamp } from "../components/ui/Primitives";
import {
  getCircle,
  getUserInvitations,
  leaveCircle,
  removeMember,
  updateMemberRole,
  transferOwnership,
} from "../services/circle.service";
import {
  ArrowLeft,
  Plus,
  UserPlus,
  ArrowLeftRight,
  Search,
  Filter,
  TrendingUp,
  Users,
  Receipt,
  DollarSign,
  Activity as ActivityIcon,
  FileText,
  Settings,
  MoreVertical,
  Edit,
  Mail,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Receipt as ReceiptIcon,
  UserPlus as UserPlusIcon,
  ArrowLeftRight as ArrowLeftRightIcon,
  UserMinus,
  ShieldCheck,
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  Undo2,
  CreditCard,
  Banknote,
  Smartphone,
  Send,
  Download,
  Clock,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { toast } from "sonner";
import AddMemberModal from "../components/forms/AddMemberModal";
import {
  confirmSettlement,
  completeSettlement,
  cancelSettlement,
  partialSettlement,
  createSettlement as createSettlementApi,
} from "../services/settlement.service";

export default function CircleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPartial, setShowPartial] = useState(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");

  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value.toString === 'function') return value.toString().trim();
    return String(value).trim();
  };

  const currentUserId = normalizeId(user?._id);

  // Use the FinancialEngine's circle-level hook — ALL data from engine
  const { circle, circleData, settlementPlan, circleRelationships, memberProfiles, circleStatistics, isLoading, isError, error, refetch } = engine.useCircle(id);

  // Members from circle data - preserve canonical Member._id as the primary identity
  const members = useMemo(() => {
    if (!circle || !circle.members) return [];
    return circle.members.map((m) => ({
      ...m,
      id: m._id,
      user: m.user || { _id: m._id, name: m.name, email: m.email },
    }));
  }, [circle]);

  // Your balance from the FinancialEngine
  const yourBalance = circleData?.yourBalance || 0;
  const owed = yourBalance >= 0;

  // Standings from the FinancialEngine
  const standings = circleData?.standings || [];

  // Categories from the FinancialEngine
  const categories = circleData?.categories || [];

  // Recent entries from the FinancialEngine
  const recentExpenses = circleData?.recentExpenses || [];

  // All circle activity
  const allActivity = (circle?.activity || []).filter(Boolean);

  // Filtered activity
  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return allActivity;
    return allActivity.filter(a => {
      const desc = (a.text || a.description || '').toLowerCase();
      const type = a.type || '';
      if (activityFilter === "expense") return type.includes('expense') || desc.includes('expense') || desc.includes('added') || desc.includes('created');
      if (activityFilter === "settlement") return type.includes('settlement') || desc.includes('settlement') || desc.includes('paid') || desc.includes('payment');
      if (activityFilter === "member") return type.includes('member') || desc.includes('joined') || desc.includes('left') || desc.includes('removed') || desc.includes('invited');
      if (activityFilter === "circle") return type.includes('updated') || type.includes('archived') || type.includes('currency') || desc.includes('settings');
      return true;
    });
  }, [allActivity, activityFilter]);

  // Settlement stats from FinancialEngine (no local calculation)
  const settlementStats = useMemo(() => {
    const all = settlementPlan?.suggestions || [];
    const pending = settlementPlan?.pending || [];
    const completed = settlementPlan?.completed || [];
    const cancelled = settlementPlan?.cancelled || [];
    return {
      outstanding: all.length,
      pending: pending.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalOutstanding: settlementPlan?.totalOutstanding || 0,
    };
  }, [settlementPlan]);

  // Monthly spending trend from circleStatistics (no local calculation)
  const monthlyTrend = circleStatistics?.monthlyTrend || [];
  
  // Largest expense from circleStatistics (no local calculation)
  const largestExpense = circleStatistics?.largestExpense || null;

  // Top category from circleStatistics (no local calculation)
  const largestCategory = circleStatistics?.topCategory?.name || null;

  // Highest spender from circleStatistics (no local calculation)
  const highestSpender = circleStatistics?.biggestSpender || null;

  const handleRetry = () => {
    engine.refreshAfterAction('EXPENSE_CREATED', id);
    refetch();
  };

  // Settlement action handlers
  const handleConfirmSettlement = async (settlementId) => {
    try {
      await confirmSettlement(settlementId);
      toast.success('Settlement confirmed');
      engine.refreshAfterAction('SETTLEMENT_CONFIRMED', id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCompleteSettlement = async (settlementId) => {
    try {
      await completeSettlement(settlementId);
      toast.success('Settlement completed');
      engine.refreshAfterAction('SETTLEMENT_COMPLETED', id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancelSettlement = async (settlementId) => {
    if (!confirm('Cancel this settlement?')) return;
    try {
      await cancelSettlement(settlementId);
      toast.success('Settlement cancelled');
      engine.refreshAfterAction('SETTLEMENT_CANCELLED', id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePartialSettlement = async (settlementId, amount) => {
    try {
      await partialSettlement(settlementId, amount);
      toast.success(`Partial payment of ${amount} recorded`);
      engine.refreshAfterAction('SETTLEMENT_COMPLETED', id);
      setShowPartial(null);
      setPartialAmount("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleQuickSettle = async (toId, amount, method, fromId) => {
    try {
      const isCircleOwner = circle?.owner ? normalizeId(circle.owner) === currentUserId : false;
      const payload = {
        circleId: id,
        to: toId,
        amount,
        paymentMethod: method || 'cash',
        title: 'Settlement',
        ...(isCircleOwner && fromId && normalizeId(fromId) !== currentUserId ? { from: fromId } : {}),
      };
      await createSettlementApi(payload);
      toast.success('Payment recorded');
      engine.refreshAfterAction('SETTLEMENT_PAID', id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSendReminder = (memberName) => {
    toast.info(`Reminder sent to ${memberName}`);
  };

  const handleExport = () => {
    toast.success('Export started. File will be downloaded shortly.');
  };

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading circle&hellip;
        </div>
      </div>
    );
  }

  if (isError || !circle) {
    return (
      <div className="p-12 text-center">
        <h2 className="font-display text-3xl">Circle not found.</h2>
        {error && <p className="mt-4 text-ink-muted font-mono text-sm">{error.message}</p>}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={handleRetry}
            className="h-10 px-4 inline-flex items-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.18em] hover:bg-ink hover:text-paper transition"
          >
            Retry
          </button>
          <Link to="/app/circles" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Circles index
          </Link>
        </div>
      </div>
    );
  }

  // ─── Time-ago helper ─────────────────────────────────
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Get full financial profile for a member from FinancialEngine (no local calculation)
  const getMemberProfile = (member) => {
    const memberId = member._id || member.id;
    const memberUserId = member.user?._id;
    // Try from memberProfiles first - match by Member._id
    const fromProfiles = memberProfiles.find(p => {
      const pm = p.member._id || p.member.id;
      return pm === memberId;
    });
    if (fromProfiles?.profile) return fromProfiles.profile;

    // Fallback: construct from standings - match by Member._id
    const standing = standings.find(s => {
      const sm = s.member;
      return (sm._id || sm.id) === memberId;
    });
    const balance = standing?.balance || 0;
    const paid = standing?.paid || 0;
    const owed = standing?.owed || 0;
    const memberSettlements = settlementPlan?.completed?.filter(s => {
      const fromId = normalizeId(typeof s.from === 'object' ? (s.from?._id || s.from?.id) : s.from);
      const toId = normalizeId(typeof s.to === 'object' ? (s.to?._id || s.to?.id) : s.to);
      return fromId === memberId || toId === memberId;
    }) || [];
    const memberPending = settlementPlan?.pending?.filter(s => {
      const fromId = normalizeId(typeof s.from === 'object' ? (s.from?._id || s.from?.id) : s.from);
      const toId = normalizeId(typeof s.to === 'object' ? (s.to?._id || s.to?.id) : s.to);
      return fromId === memberId || toId === memberId;
    }) || [];
    return { balance, paid, owed, settlements: memberSettlements.length, pendingSettlements: memberPending.length, totalPaid: paid, totalShare: owed, amountToReceive: Math.max(0, balance), amountToPay: Math.max(0, -balance), completedSettlements: memberSettlements.length, biggestExpense: null, lastExpense: null, lastSettlement: null, averageExpense: paid > 0 ? paid / (standing?.count || 1) : 0, status: balance >= 0 ? 'ahead' : 'behind', expenseCount: standing?.count || 0 };
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <ActivityIcon className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "balances", label: "Balances", icon: <DollarSign className="h-4 w-4" /> },
    { id: "settlements", label: "Settlements", icon: <ArrowLeftRight className="h-4 w-4" /> },
    { id: "activity", label: "Activity", icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div>
      {/* ─── Circle Header ────────────────────────────────────────── */}
      <section className="px-5 md:px-10 lg:px-14 pt-8 pb-8 border-b border-ink">
        <Link
          to="/app/circles"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Circles index
        </Link>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Pill tone="ink">{circle.category || 'circle'}</Pill>
              <Pill tone="neutral">{circle.currency}</Pill>
              <Pill tone={settlementStats.outstanding > 0 ? "vermilion" : "ledger"}>
                {settlementStats.outstanding > 0 ? `${settlementStats.outstanding} pending` : 'balanced'}
              </Pill>
              <Pill tone="muted">{circleData?.expenseCount || 0} entries</Pill>
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">{circle.name}</h1>
            <p className="mt-4 font-display italic text-xl text-ink-soft max-w-lg">
              {circle.description || ''}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <AvatarStack members={members} size={28} max={6} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                {(circleData?.memberCount || members.length || 0)} members
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                · Total: <Figure value={circleData?.totalSpent || 0} currency={circle.currency} size="sm" />
              </span>
              {circleData?.lastActivity && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  · Last: {timeAgo(circleData.lastActivity)}
                </span>
              )}
            </div>
          </div>

           <div>
              <div className="eyebrow mb-2">{owed ? "Owed to you" : "You owe"}</div>
              <div className="flex items-end justify-between gap-6">
                <Figure
                  value={Math.abs(yourBalance)}
                  currency={circle.currency}
                  size="xl"
                  tone={owed ? "ledger" : "vermilion"}
                />
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  <Link to="/app/expenses/new" className="h-9 px-4 inline-flex items-center gap-2 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-vermilion transition">
                    <Plus className="h-3.5 w-3.5" /> Entry
                  </Link>
                  <button onClick={() => setActiveTab('settlements')} className="h-9 px-4 inline-flex items-center gap-2 border border-ink font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition">
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Settle
                  </button>
                  <button onClick={handleExport} className="h-9 px-4 inline-flex items-center gap-2 border border-rule font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                </div>
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Total spent <Figure value={circleData?.totalSpent || 0} currency={circle.currency} size="sm" />
              </div>
            </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="px-5 md:px-10 lg:px-14 border-b border-ink bg-paper-deep/30">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={"flex items-center gap-2 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] border-b-2 transition whitespace-nowrap " + (activeTab === tab.id ? "border-ink bg-card" : "border-transparent hover:border-rule")}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "settlements" && settlementStats.outstanding > 0 && (
                <span className="ml-1 w-2 h-2 rounded-full bg-vermilion" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <section className="px-5 md:px-10 lg:px-14 py-10">
        {/* ════════════════════════════════════════════════════════
            Overview — Mission Control Dashboard
            ════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10">
            <div className="space-y-10">
              {settlementStats.outstanding > 0 && (
                <div className="border-2 border-vermilion bg-vermilion/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-1">Outstanding debt</div>
                      <Figure value={settlementStats.totalOutstanding} currency={circle.currency} size="xl" tone="vermilion" />
                    </div>
                    <button
                      onClick={() => setActiveTab('settlements')}
                      className="h-9 px-4 bg-vermilion text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition"
                    >
                      {settlementStats.outstanding} to settle
                    </button>
                  </div>
                  {circleRelationships.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {circleRelationships.slice(0, 3).map((r, i) => (
                        <div key={i} className="font-mono text-[11px] text-ink-soft">
                          {r.fromName.split(" ")[0]} owes {r.toName.split(" ")[0]} <Figure value={r.amount} currency={r.currency} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Expenses */}
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-2xl">Recent entries</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                    {circleData?.expenseCount || 0} filed
                  </span>
                </div>
                {recentExpenses.length === 0 ? (
                  <div className="py-8 text-center text-ink-muted italic border-2 border-dashed border-rule">
                    No entries yet — file the first one.
                  </div>
                ) : (
                  <ol className="border-t border-ink">
                    {recentExpenses.slice(0, 8).map((e) => {
                      const payer = e.paidBy || {};
                      return (
                        <li key={e._id || e.id} className="border-b border-rule">
                          <Link
                            to={`/app/expenses/${e._id || e.id}`}
                            className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-4 hover:bg-paper-deep/40 transition px-2 -mx-2"
                          >
                            <AvatarDot member={payer} size={28} />
                            <div className="min-w-0">
                              <div className="font-display text-base leading-tight truncate">{e.title || e.description}</div>
                              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted mt-0.5">
                                {e.date ? new Date(e.date).toLocaleDateString() : ''} · {e.category || ''} · {e.splitMethod || ''}
                              </div>
                            </div>
                            <Figure value={e.amount} currency={circle.currency} size="sm" tone="ink" />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* Monthly Spending Trend — from FinancialEngine */}
              {monthlyTrend.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl mb-4">Monthly spending</h3>
                  <div className="border border-ink bg-card p-5">
                    <div className="space-y-2">
                      {monthlyTrend.map((m) => (
                        <div key={m.month} className="flex items-center gap-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted w-16">
                            {m.month}
                          </div>
                          <div className="flex-1 h-8 bg-paper-deep relative">
                            <div
                              className="h-full bg-ink transition-all"
                              style={{ width: `${Math.min((m.value / Math.max(...monthlyTrend.map(t => t.value))) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="font-mono text-xs w-20 text-right">
                            <Figure value={m.value} currency={circle.currency} size="xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="border border-ink bg-card p-5">
                <div className="eyebrow mb-3">Members</div>
                <div className="flex flex-wrap gap-2">
                  {members.slice(0, 8).map((m) => (
                    <AvatarDot key={m._id || m.id} member={m} size={28} />
                  ))}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-3">
                  {(circleData?.memberCount || members.length || 0)} members
                </div>
              </div>

              <div className="border border-ink bg-card p-5">
                <div className="eyebrow mb-2">Activity</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(filteredActivity || []).slice(0, 20).map((a) => (
                    <div key={a._id || a.id} className="text-sm">
                      <span className="text-ink-soft">{a.user?.name || 'A user'}</span>{' '}
                      <span className="text-ink-muted">{a.text || a.description || ''}</span>
                      <div className="font-mono text-[9px] text-ink-muted">{timeAgo(a.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
           </div>
        )}

        {/* ════════════════════════════════════════════════════════
            Members — Complete Financial Profiles from FinancialEngine
            ════════════════════════════════════════════════════════ */}
        {activeTab === "members" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl">Members</h2>
              <button
                onClick={() => setShowAddMember(true)}
                className="h-9 px-3 inline-flex items-center gap-2 bg-vermilion text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink transition"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Person
              </button>
            </div>
            <ul className="grid md:grid-cols-2 gap-4">
              {members.map((m) => {
                const memberUser = m.user || m;
                const memberName = memberUser.name || memberUser.handle || m.displayName || 'Guest';
                const profile = getMemberProfile(m);

                const getStatusBadge = () => {
                  if (m.isGuest) return <span className="px-2 py-1 bg-ink-muted/20 text-ink-muted font-mono text-[9px] uppercase tracking-[0.12em]">Guest</span>;
                  if (m.status === 'pending_invitation') return <span className="px-2 py-1 bg-vermilion/20 text-vermilion font-mono text-[9px] uppercase tracking-[0.12em]">Pending</span>;
                  if (m.status === 'registered' || m.user) return <span className="px-2 py-1 bg-ledger/20 text-ledger font-mono text-[9px] uppercase tracking-[0.12em]">Registered</span>;
                  return null;
                };

                const isOwner = m.role === 'owner';
                const memberUserId = typeof m.user === 'object' ? m.user?._id : (m.user || m._id || m.id);
                const isCurrentUser = normalizeId(memberUserId) === currentUserId;
                const canManage = !isCurrentUser && (normalizeId(circle.owner) === currentUserId || user.role === 'admin');
                const isCircleOwner = circle?.owner ? normalizeId(circle.owner) === currentUserId : false;

                return (
                  <li key={m._id || m.id} className="border border-ink bg-card p-6">
                    {/* Avatar + Name + Balance */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <AvatarDot member={{ ...memberUser, name: memberName }} size={44} />
                        <div>
                          <div className="font-display text-xl">{memberName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                              {m.role}
                            </div>
                            {getStatusBadge()}
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                            Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Figure
                          value={profile.balance}
                          currency={circle.currency}
                          size="lg"
                          signed
                          tone={profile.balance >= 0 ? "ledger" : "vermilion"}
                        />
                        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                          {profile.balance >= 0 ? "To receive" : "To pay"}
                        </div>
                      </div>
                    </div>

                    {/* Full Financial Profile Grid — all from FinancialEngine */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">Paid</div>
                        <Figure value={profile.paid} currency={circle.currency} size="sm" tone="ledger" />
                      </div>
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">Share</div>
                        <Figure value={profile.owed || profile.totalShare} currency={circle.currency} size="sm" tone="vermilion" />
                      </div>
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">Net</div>
                        <Figure value={profile.balance} currency={circle.currency} size="sm" signed tone={profile.balance >= 0 ? "ledger" : "vermilion"} />
                      </div>
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">To receive</div>
                        <Figure value={Math.max(0, profile.balance)} currency={circle.currency} size="sm" tone="ledger" />
                      </div>
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">To pay</div>
                        <Figure value={Math.max(0, -profile.balance)} currency={circle.currency} size="sm" tone="vermilion" />
                      </div>
                      <div className="p-3 border border-rule bg-paper">
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">Settlements</div>
                        <div className="font-display text-base">
                          {profile.settlements || profile.completedSettlements || 0}
                          {profile.pendingSettlements > 0 && (
                            <span className="text-vermilion ml-1">({profile.pendingSettlements})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional profile info */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {profile.averageExpense > 0 && (
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">
                          Avg expense: <Figure value={profile.averageExpense} currency={circle.currency} size="sm" />
                        </div>
                      )}
                      {profile.expenseCount > 0 && (
                        <div className="font-mono text-[9px] text-ink-muted text-right">
                          {profile.expenseCount} expenses
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/app/expenses/new?member=${m._id || m.id}`} className="h-8 px-3 inline-flex items-center gap-1.5 border border-ink font-mono text-[9px] uppercase tracking-[0.14em] hover:bg-paper-deep transition">
                        <ReceiptIcon className="h-3 w-3" /> Expense
                      </Link>
                      {profile.balance > 0 && (isCircleOwner || !m.isGuest) && !isCurrentUser && (
                        <>
                          <button
                            onClick={() => handleQuickSettle(m._id || m.id, profile.balance, 'cash')}
                            className="h-8 px-3 inline-flex items-center gap-1.5 border border-ink font-mono text-[9px] uppercase tracking-[0.14em] hover:bg-paper-deep transition"
                          >
                            <ArrowLeftRightIcon className="h-3 w-3" /> Settle
                          </button>
                          <button
                            onClick={() => handleSendReminder(memberName)}
                            className="h-8 px-3 inline-flex items-center gap-1.5 border border-rule font-mono text-[9px] uppercase tracking-[0.14em] hover:bg-paper-deep transition"
                          >
                            <Send className="h-3 w-3" /> Remind
                          </button>
                        </>
                      )}
                      {canManage && !isOwner && (
                        <>
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove ${memberName}?`)) return;
                              try {
                                await removeMember(circle.id, m._id || m.id);
                                toast.success(`${memberName} removed`);
                                engine.refreshAfterAction('MEMBER_REMOVED', id);
                              } catch (err) { toast.error(err.message); }
                            }}
                            className="h-8 px-3 inline-flex items-center gap-1.5 border border-vermilion text-vermilion font-mono text-[9px] uppercase tracking-[0.14em] hover:bg-vermilion/10 transition"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </>
                      )}
                    </div>

                    {/* Status */}
                    <div className="mt-4 pt-4 border-t border-rule flex items-center justify-between">
                      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                        {profile.status === 'ahead' ? 'Ahead' : profile.status === 'behind' ? 'Behind' : 'Balanced'} · {profile.settlements || profile.completedSettlements || 0} settled
                      </div>
                      {profile.balance >= 0 ? (
                        <span className="font-mono text-[9px] text-ledger">Can receive</span>
                      ) : (
                        <span className="font-mono text-[9px] text-vermilion">Needs to pay</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            Balance Breakdown — from FinancialEngine
            ════════════════════════════════════════════════════════ */}
        {activeTab === "balances" && (
          <div>
            <h2 className="font-display text-3xl mb-6">Balance breakdown</h2>
            
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="border border-ink bg-card p-6">
                <div className="eyebrow mb-2">Total group spending</div>
                <Figure value={circleData?.totalSpent || 0} currency={circle.currency} size="xl" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
                  {circleData?.expenseCount || 0} expenses
                </div>
              </div>
              <div className="border border-ink bg-card p-6">
                <div className="eyebrow mb-2">Money you will receive</div>
                <Figure value={Math.max(0, yourBalance)} currency={circle.currency} size="xl" tone="ledger" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
                  from other members
                </div>
              </div>
              <div className="border border-ink bg-card p-6">
                <div className="eyebrow mb-2">Money you owe</div>
                <Figure value={Math.max(0, -yourBalance)} currency={circle.currency} size="xl" tone="vermilion" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
                  to other members
                </div>
              </div>
            </div>

            {/* Member Contributions */}
            <div className="border border-ink bg-card p-8 mb-8">
              <div className="eyebrow mb-6">Member contribution</div>
              <div className="space-y-4">
                {standings.map((s) => {
                  const member = s.member.user || s.member;
                  const memberName = member.name || member.handle || 'Guest';
                  const pct = circleData?.totalSpent > 0 ? Math.round((s.paid / circleData.totalSpent) * 100) : 0;
                  return (
                    <div key={member._id || member.id} className="flex items-center gap-4">
                      <AvatarDot member={{ ...member, name: memberName }} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm">{memberName}</div>
                        <div className="h-2 bg-rule mt-1">
                          <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <Figure value={s.paid} currency={circle.currency} size="sm" tone={s.paid > 0 ? "ledger" : "muted"} />
                        <div className="font-mono text-[9px] text-ink-muted">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Who owes whom (from FinancialEngine) & Settlement Preview */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-ink bg-card p-6">
                <div className="eyebrow mb-4">Who owes whom</div>
                {circleRelationships.length > 0 ? (
                  <ul className="space-y-3">
                    {circleRelationships.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 border-b border-dashed border-rule last:border-0">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-display text-sm">{r.fromName}</div>
                            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">
                              owes {r.toName}
                            </div>
                          </div>
                        </div>
                        <Figure value={r.amount} currency={r.currency} size="sm" tone="vermilion" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 text-center">
                    <CheckCircle className="h-8 w-8 text-ledger mx-auto mb-2" />
                    <div className="font-display text-lg mb-1">All squared up</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                      No debts between members
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-ink bg-card p-6">
                <div className="eyebrow mb-4">Settlement preview</div>
                {settlementPlan?.suggestions && settlementPlan.suggestions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 border-2 border-vermilion bg-vermilion/5 mb-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">Total outstanding</div>
                      <Figure value={settlementPlan.totalOutstanding} currency={circle.currency} size="lg" tone="vermilion" />
                    </div>
                    <ul className="space-y-2">
                      {settlementPlan.suggestions.slice(0, 5).map((s) => {
                        const fromName = s.from?.name || 'A user';
                        const toName = s.to?.name || 'A user';
                        return (
                          <li key={s.id} className="flex items-center justify-between py-1.5 border-b border-dashed border-rule last:border-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span>{fromName.split(" ")[0]}</span>
                              <span className="text-ink-muted">→</span>
                              <span>{toName.split(" ")[0]}</span>
                            </div>
                            <Figure value={s.amount} currency={s.currency || circle.currency} size="sm" tone="vermilion" />
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      onClick={() => setActiveTab('settlements')}
                      className="h-8 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-vermilion transition mt-3"
                    >
                      Settle now
                    </button>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-ledger bg-ledger/5 text-center">
                    <CheckCircle className="h-8 w-8 text-ledger mx-auto mb-2" />
                    <div className="font-display text-lg mb-1">All settled up!</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                      No outstanding balances remain. Every member has paid their share.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            Settlements with full workflow — from FinancialEngine
            ════════════════════════════════════════════════════════ */}
        {activeTab === "settlements" && (
          <div>
            <h2 className="font-display text-3xl mb-6">Settlements</h2>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border border-ink bg-card p-4">
                <div className="eyebrow mb-2 text-[9px]">Suggested</div>
                <div className="font-display text-2xl text-ledger">{settlementStats.outstanding}</div>
              </div>
              <div className="border border-ink bg-card p-4">
                <div className="eyebrow mb-2 text-[9px]">Pending</div>
                <div className="font-display text-2xl text-vermilion">{settlementStats.pending}</div>
              </div>
              <div className="border border-ink bg-card p-4">
                <div className="eyebrow mb-2 text-[9px]">Completed</div>
                <div className="font-display text-2xl text-ledger">{settlementStats.completed}</div>
              </div>
              <div className="border border-ink bg-card p-4">
                <div className="eyebrow mb-2 text-[9px]">Cancelled</div>
                <div className="font-display text-2xl text-ink-muted">{settlementStats.cancelled}</div>
              </div>
            </div>

             {/* Suggested settlements */}
                      {settlementPlan?.suggestions && settlementPlan.suggestions.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-display text-2xl mb-4">Suggested</h3>
                  <ul className="border border-ink bg-card divide-y divide-rule">
                      {settlementPlan.suggestions.map((s) => {
                        const fromName = s.from?.name || 'A user';
                        const toName = s.to?.name || 'A user';
                        const fromId = normalizeId(s.from?.id || s.fromId);
                        const toId = normalizeId(s.to?.id || s.toId);
                        const isCurrentUserPayer = fromId === engine.currentMemberId;
                        const isCurrentUserReceiver = toId === engine.currentMemberId;
                        const isCircleOwner = circle?.owner ? normalizeId(circle.owner) === currentUserId : false;
                        const canRecordPayment = isCurrentUserPayer || isCircleOwner;

                       return (
                         <li key={s.id} className="px-4 py-4">
                           <div className="flex items-center justify-between gap-3 mb-3">
                             <div className="flex items-center gap-3 min-w-0">
                               <AvatarDot member={{ name: fromName }} size={32} />
                               <span className="font-display text-base">
                                 {fromName.split(" ")[0]} <span className="text-ink-muted">→</span> {toName.split(" ")[0]}
                               </span>
                             </div>
                             <Figure value={s.amount} currency={s.currency || circle.currency} size="sm" tone="vermilion" />
                           </div>
                           <div className="ml-11 mb-3 font-mono text-[11px] text-ink-soft">
                             {fromName.split(" ")[0]} owes {toName.split(" ")[0]} <Figure value={s.amount} currency={s.currency || circle.currency} size="sm" />
                           </div>
                           {canRecordPayment ? (
                             <div className="flex flex-wrap gap-2 ml-11">
                           <button
                             onClick={() => handleQuickSettle(toId, s.amount, 'cash', fromId)}
                             className="h-8 px-3 bg-ledger text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition flex items-center gap-1"
                           >
                             <CheckCircle className="h-3 w-3" /> Record Payment
                           </button>
                           <div className="flex gap-1">
                             <button
                               onClick={() => handleQuickSettle(toId, s.amount, 'cash', fromId)}
                               className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                               title="Record Cash"
                             >
                               <Banknote className="h-3.5 w-3.5" />
                             </button>
                             <button
                               onClick={() => handleQuickSettle(toId, s.amount, 'upi', fromId)}
                               className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                               title="Record UPI"
                             >
                               <Smartphone className="h-3.5 w-3.5" />
                             </button>
                             <button
                               onClick={() => handleQuickSettle(toId, s.amount, 'bank_transfer', fromId)}
                               className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                               title="Record Bank Transfer"
                             >
                               <CreditCard className="h-3.5 w-3.5" />
                             </button>
                           </div>
                             </div>
                           ) : isCurrentUserReceiver ? (
                             <div className="ml-11 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                               Waiting for {fromName.split(' ')[0]} to record payment
                             </div>
                           ) : (
                             <div className="ml-11 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                               {fromName.split(' ')[0]} needs to record this payment
                             </div>
                           )}
                         </li>
                       );
                     })}
                 </ul>
               </div>
             )}

            {/* Pending settlements */}
            {settlementPlan?.pending && settlementPlan.pending.length > 0 && (
              <div className="mb-10">
                <h3 className="font-display text-2xl mb-4">Pending</h3>
                <ul className="border border-ink bg-card divide-y divide-rule">
                  {settlementPlan.pending.map((s) => {
                    const fromName = typeof s.from === 'object' ? (s.from?.name || 'A user') : (s.fromName || 'A user');
                    const toName = typeof s.to === 'object' ? (s.to?.name || 'A user') : (s.toName || 'A user');
                    const fromId = normalizeId(typeof s.from === 'object' ? (s.from?._id || s.from?.id) : s.from);
                    const toId = normalizeId(typeof s.to === 'object' ? (s.to?._id || s.to?.id) : s.to);
                     const isReceiver = toId === engine.currentMemberId;
                    const remaining = s.remainingAmount || s.amount || 0;

                    return (
                      <li key={s._id || s.id} className="px-4 py-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarDot member={{ name: fromName }} size={32} />
                            <span className="font-display text-base">
                              {fromName.split(" ")[0]} <span className="text-ink-muted">→</span> {toName.split(" ")[0]}
                            </span>
                          </div>
                          <div className="text-right">
                            <Figure value={s.amount} currency={s.currency || circle.currency} size="sm" tone="vermilion" />
                            {remaining < s.amount && (
                              <div className="font-mono text-[9px] text-ink-muted">
                                Remaining: <Figure value={remaining} currency={s.currency || circle.currency} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-11">
                          {isReceiver && (
                            <button
                              onClick={() => handleConfirmSettlement(s._id || s.id)}
                              className="h-8 px-3 bg-ledger text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition flex items-center gap-1"
                            >
                              <CheckCircle className="h-3 w-3" /> Confirm
                            </button>
                          )}
                          {!isReceiver && (
                            <>
                              <button
                                onClick={() => handleCompleteSettlement(s._id || s.id)}
                                className="h-8 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ledger transition flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" /> Mark Paid
                              </button>
                              <button
                                onClick={() => {
                                  setShowPartial(s._id || s.id);
                                  setPartialAmount(String(remaining / 2));
                                }}
                                className="h-8 px-3 border border-ink font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition flex items-center gap-1"
                              >
                                <DollarSign className="h-3 w-3" /> Partial
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Cancel this settlement?')) handleCancelSettlement(s._id || s.id);
                            }}
                            className="h-8 px-3 border border-vermilion text-vermilion font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-vermilion/10 transition flex items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Cancel
                          </button>
                          <button
                            onClick={() => handleSendReminder(isReceiver ? fromName : toName)}
                            className="h-8 w-8 border border-rule grid place-items-center hover:bg-paper-deep transition"
                            title="Send Reminder"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Partial payment form */}
                        {showPartial === (s._id || s.id) && (
                          <div className="mt-3 ml-11 p-4 border border-ink bg-paper-deep">
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2">Partial payment</div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                                className="h-9 px-3 border-2 border-ink bg-card font-display text-sm w-28 focus:outline-none focus:border-vermilion"
                                step="0.01"
                                min="0.01"
                                max={remaining}
                              />
                              <button
                                onClick={() => handlePartialSettlement(s._id || s.id, parseFloat(partialAmount))}
                                className="h-9 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ledger transition"
                              >
                                Record
                              </button>
                              <button
                                onClick={() => { setShowPartial(null); setPartialAmount(""); }}
                                className="h-9 px-3 border border-ink font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Completed settlements */}
            {settlementPlan?.completed && settlementPlan.completed.length > 0 && (
              <div>
                <h3 className="font-display text-2xl mb-4">Completed</h3>
                <div className="border border-ink bg-card overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-ink bg-paper-deep">
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Amount</th>
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Payer</th>
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Receiver</th>
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Method</th>
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Date</th>
                        <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">Ref ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {settlementPlan.completed.map((s) => {
                        const fromName = typeof s.from === 'object' ? (s.from?.name || 'A user') : (s.fromName || 'A user');
                        const toName = typeof s.to === 'object' ? (s.to?.name || 'A user') : (s.toName || 'A user');
                        return (
                          <tr key={s._id || s.id} className="hover:bg-paper-deep/40 transition">
                            <td className="px-4 py-3"><Figure value={s.amount} currency={s.currency || circle.currency} size="sm" tone="ledger" /></td>
                            <td className="px-4 py-3 font-display text-sm">{fromName}</td>
                            <td className="px-4 py-3 font-display text-sm">{toName}</td>
                            <td className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em]">{s.paymentMethod?.replace('_', ' ') || 'other'}</td>
                            <td className="px-4 py-3 font-mono text-[9px]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-3 font-mono text-[8px] text-ink-muted">{(s._id || s.id || '').slice(-8)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No settlements at all — intelligent empty state */}
            {(!settlementPlan || (
              settlementPlan.suggestions.length === 0 &&
              settlementPlan.pending.length === 0 &&
              settlementPlan.completed.length === 0
            )) && (
              <div className="py-12 text-center border-2 border-dashed border-rule">
                <CheckCircle className="h-10 w-10 text-ledger mx-auto mb-3" />
                <div className="font-display text-2xl mb-1">All settled up</div>
                <p className="text-ink-muted text-sm">There are currently no settlement suggestions because every member has already paid their share. Add an expense to create new settlement activity.</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            Activity — Audit Log
            ════════════════════════════════════════════════════════ */}
        {activeTab === "activity" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl">Activity</h2>
              <div className="flex gap-2">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="h-9 px-3 border-2 border-ink bg-card font-mono text-[10px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
                >
                  <option value="all">All</option>
                  <option value="expense">Expenses</option>
                  <option value="settlement">Settlements</option>
                  <option value="member">Members</option>
                  <option value="circle">Circle</option>
                </select>
              </div>
            </div>

            {filteredActivity.length === 0 ? (
              <div className="py-10 text-center text-ink-muted italic border-2 border-dashed border-rule">
                No activity yet. Start by adding an expense or inviting members.
              </div>
            ) : (
              <ol className="space-y-0">
                {filteredActivity.map((a, i) => {
                  const actor = a.user || a.actor || {};
                  const actorName = actor.name || actor.handle || 'A user';
                  const description = a.text || a.description || '';
                  const amount = a.amount;
                  const activityType = a.type || '';

                  const descLower = description.toLowerCase();
                  let activityIcon = <ActivityIcon className="h-4 w-4 text-ink-muted" />;
                  let activityColor = "text-ink-muted";

                  if (activityType.includes('expense') || descLower.includes('expense') || descLower.includes('added') || descLower.includes('created') || descLower.includes('filed')) {
                    activityIcon = <ReceiptIcon className="h-4 w-4 text-ledger" />;
                    activityColor = "text-ledger";
                  } else if (activityType.includes('settlement') || descLower.includes('settlement') || descLower.includes('paid') || descLower.includes('confirmed') || descLower.includes('completed') || descLower.includes('cancelled')) {
                    activityIcon = <ArrowLeftRightIcon className="h-4 w-4 text-vermilion" />;
                    activityColor = "text-vermilion";
                  } else if (activityType.includes('member') || descLower.includes('joined') || descLower.includes('left') || descLower.includes('removed') || descLower.includes('invited') || descLower.includes('added')) {
                    activityIcon = <UserPlusIcon className="h-4 w-4 text-ledger" />;
                    activityColor = "text-ledger";
                  } else if (activityType.includes('updated') || descLower.includes('edited')) {
                    activityIcon = <Edit className="h-4 w-4 text-ink-soft" />;
                    activityColor = "text-ink-soft";
                  } else if (activityType.includes('owner') || descLower.includes('transfer')) {
                    activityIcon = <ShieldCheck className="h-4 w-4 text-ledger" />;
                    activityColor = "text-ledger";
                  } else if (activityType.includes('archived') || descLower.includes('archived') || descLower.includes('restored')) {
                    activityIcon = <SettingsIcon className="h-4 w-4 text-ink-muted" />;
                    activityColor = "text-ink-muted";
                  }

                  const timeAgoStr = timeAgo(a.createdAt || a.time);

                  return (
                    <li key={a._id || a.id || i} className={`relative grid grid-cols-[auto_1fr] gap-5 py-4 border-b border-rule last:border-0 -mx-4 px-4 hover:bg-paper-deep/40 transition`}>
                      {i < filteredActivity.length - 1 && <div className="absolute left-[19px] top-[48px] bottom-0 w-px bg-rule" />}
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full border-2 border-ink bg-card grid place-items-center ${activityColor}`}>
                          {activityIcon}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-base leading-snug">
                          <span className="text-ink font-medium">{actorName}</span>
                          <span className="text-ink-muted"> {description}</span>
                          {amount != null && amount > 0 && (
                            <span className="ml-1.5 inline-block">
                              <Figure value={amount} currency={circle.currency} size="sm" />
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                            {timeAgoStr}
                          </div>
                          {a.createdAt && (
                            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted/50">
                              · {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>

      {/* Add Member Modal */}
      {showAddMember && id && (
        <AddMemberModal
          circleId={id}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            engine.refreshAfterAction("MEMBER_ADDED", id);
            refetch();
          }}
        />
      )}
    </div>
  );
}