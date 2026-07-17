import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { getUserActivities } from "../services/activity.service";
import { Figure, Pill } from "../components/ui/Primitives";
import { 
  Activity as ActivityIcon, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  ArrowLeftRight, 
  UserPlus, 
  UserMinus, 
  Edit, 
  ShieldCheck, 
  Settings as SettingsIcon,
  Clock,
  Filter,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const ACTIVITY_ICON_MAP = {
  expense_created: { icon: Receipt, color: "text-ledger", label: "Expense" },
  expense_added: { icon: Receipt, color: "text-ledger", label: "Expense" },
  expense_updated: { icon: Edit, color: "text-ink-soft", label: "Edited" },
  expense_edited: { icon: Edit, color: "text-ink-soft", label: "Edited" },
  expense_deleted: { icon: ActivityIcon, color: "text-vermilion", label: "Deleted" },
  settlement_suggested: { icon: ArrowLeftRight, color: "text-vermilion", label: "Settlement" },
  settlement_created: { icon: ArrowLeftRight, color: "text-vermilion", label: "Settlement" },
  settlement_confirmed: { icon: ArrowLeftRight, color: "text-ledger", label: "Confirmed" },
  settlement_completed: { icon: ArrowLeftRight, color: "text-ledger", label: "Completed" },
  settlement_cancelled: { icon: ArrowLeftRight, color: "text-ink-muted", label: "Cancelled" },
  member_added: { icon: UserPlus, color: "text-ledger", label: "Member" },
  member_joined: { icon: UserPlus, color: "text-ledger", label: "Member" },
  member_left: { icon: UserMinus, color: "text-vermilion", label: "Left" },
  member_removed: { icon: UserMinus, color: "text-vermilion", label: "Removed" },
  member_invited: { icon: UserPlus, color: "text-ink-soft", label: "Invited" },
  guest_converted: { icon: UserPlus, color: "text-ledger", label: "Converted" },
  circle_created: { icon: ActivityIcon, color: "text-ledger", label: "Circle" },
  circle_updated: { icon: SettingsIcon, color: "text-ink-soft", label: "Updated" },
  circle_archived: { icon: SettingsIcon, color: "text-ink-muted", label: "Archived" },
  circle_restored: { icon: SettingsIcon, color: "text-ledger", label: "Restored" },
  currency_changed: { icon: SettingsIcon, color: "text-ink-soft", label: "Currency" },
  ownership_transferred: { icon: ShieldCheck, color: "text-ledger", label: "Owner" },
  payment_received: { icon: DollarSign, color: "text-ledger", label: "Payment" },
  reminder_sent: { icon: ActivityIcon, color: "text-ink-muted", label: "Reminder" },
  default: { icon: ActivityIcon, color: "text-ink-muted", label: "Activity" },
};

export default function Activity() {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCurrency = engine.userCurrency;
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: activityData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activity", filter, dateRange],
    queryFn: () => getUserActivities({ type: filter === 'all' ? undefined : filter, limit: 200 }),
    staleTime: 60 * 1000,
  });

  const activities = activityData?.activities || [];
  const stats = activityData?.stats || { totalAmount: 0, expenseCount: 0, settlementCount: 0, thisMonthAmount: 0 };

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    // Apply type filter
    if (filter !== "all") {
      filtered = filtered.filter(a => {
        const type = a.type || '';
        const desc = (a.description || '').toLowerCase();
        if (filter === 'expense') return type.includes('expense') || desc.includes('expense') || desc.includes('added') || desc.includes('filed');
        if (filter === 'settlement') return type.includes('settlement') || desc.includes('settlement') || desc.includes('paid') || desc.includes('payment');
        if (filter === 'member') return type.includes('member') || desc.includes('joined') || desc.includes('left') || desc.includes('removed') || desc.includes('invited');
        if (filter === 'circle') return type.includes('circle') || type.includes('updated') || type.includes('archived') || desc.includes('settings');
        return true;
      });
    }

    // Apply date range
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "7d") cutoff.setDate(now.getDate() - 7);
      else if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "90d") cutoff.setDate(now.getDate() - 90);
      
      filtered = filtered.filter(a => {
        const d = new Date(a.date || a.createdAt || a.time);
        return d >= cutoff;
      });
    }

    return filtered.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [activities, filter, dateRange]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
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

  // Build navigation links for activity items
  const getActivityLink = (activity) => {
    const type = activity.type || '';
    const circleId = activity.circleId || activity.groupId;
    const expenseId = activity.expenseId || activity.relatedId;
    const settlementId = activity.settlementId;
    
    if (type.includes('expense') && expenseId) {
      return `/app/expenses/${expenseId}`;
    }
    if (type.includes('settlement') && circleId) {
      return `/app/circles/${circleId}?tab=settlements`;
    }
    if (circleId) {
      return `/app/circles/${circleId}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading activity&hellip;
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="border-2 border-vermilion bg-vermilion/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion mb-3">
            Failed to load activity
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

  return (
    <div>
      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
        III · Activity
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
              Every <em className="italic">move.</em>
            </h1>
            <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
              Complete audit log of expenses, settlements, members, and changes across all your circles.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="h-9 px-3 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Total volume</div>
            <Figure value={stats.totalAmount} currency={userCurrency} size="xl" tone="ink" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              All time
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Expenses</div>
            <div className="font-figure tabular-nums text-4xl text-ink">{stats.expenseCount}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Expenses logged
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Settlements</div>
            <div className="font-figure tabular-nums text-4xl text-ledger">{stats.settlementCount || 0}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Completed
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">This month</div>
            <Figure value={stats.thisMonthAmount || 0} currency={userCurrency} size="xl" tone="ledger" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Current period
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All activity</option>
            <option value="expense">Expenses</option>
            <option value="settlement">Settlements</option>
            <option value="circle">Circles</option>
            <option value="member">Members</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="px-5 md:px-10 lg:px-14 py-10">
        {filteredActivities.length === 0 ? (
          <div className="border-2 border-dashed border-rule p-16 text-center">
            <ActivityIcon className="h-12 w-12 mx-auto mb-4 text-ink-muted" />
            <div className="font-display text-2xl mb-2">No activity yet</div>
            <p className="text-ink-muted text-sm">Your complete activity history will appear here as you use the app.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredActivities.map((activity, idx) => {
              const type = activity.type || 'default';
              const iconConfig = ACTIVITY_ICON_MAP[type] || ACTIVITY_ICON_MAP.default;
              const IconComponent = iconConfig.icon;
              
              const actorName = activity.actorName || activity.user?.name || activity.actor?.name || 'A user';
              const actorId = activity.userId || activity.actorId || activity.user?._id || activity.actor?._id;
              const description = activity.description || activity.text || '';
              const circleName = activity.circleName || activity.groupName || '';
              const circleId = activity.circleId || activity.groupId;
              const amount = activity.amount;
              const isCurrentUser = actorId === user._id || actorId === user.id;
              
              // Build navigation link
              const activityLink = getActivityLink(activity);
              const Wrapper = activityLink ? Link : 'div';
              const wrapperProps = activityLink ? { to: activityLink, className: `relative grid grid-cols-[auto_1fr] gap-5 py-5 border-b border-rule last:border-0 hover:bg-paper-deep/40 transition -mx-4 px-4` } : { className: `relative grid grid-cols-[auto_1fr] gap-5 py-5 border-b border-rule last:border-0 hover:bg-paper-deep/40 transition -mx-4 px-4` };

              return (
                <Wrapper key={activity.id || idx} {...wrapperProps}>
                  {idx < filteredActivities.length - 1 && <div className="absolute left-[19px] top-[48px] bottom-0 w-px bg-rule" />}
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-full border-2 border-ink bg-card grid place-items-center ${iconConfig.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill tone={
                        type.includes('expense') ? 'ink' : 
                        type.includes('settlement') ? 'vermilion' : 
                        type.includes('member') ? 'ledger' : 'neutral'
                      } className="text-[8px]">
                        {iconConfig.label}
                      </Pill>
                      {activityLink && (
                        <ExternalLink className="h-3 w-3 text-ink-muted" />
                      )}
                    </div>
                    <p className="font-display text-base leading-snug">
                      <span className="text-ink font-medium">{isCurrentUser ? 'You' : actorName}</span>
                      <span className="text-ink-muted"> {description}</span>
                      {amount != null && amount > 0 && (
                        <span className="ml-1.5 inline-block">
                          <Figure value={amount} currency={activity.currency || userCurrency} size="sm" />
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                        {timeAgo(activity.date || activity.createdAt || activity.time)}
                      </div>
                      {circleName && (
                        <>
                          <span className="text-ink-muted/30">·</span>
                          {circleId ? (
                            <Link to={`/app/circles/${circleId}`} className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted hover:text-ink underline underline-offset-2">
                              {circleName}
                            </Link>
                          ) : (
                            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                              {circleName}
                            </span>
                          )}
                        </>
                      )}
                      {(activity.date || activity.createdAt) && (
                        <>
                          <span className="text-ink-muted/30">·</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted/50">
                            {new Date(activity.date || activity.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}