import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AvatarDot, Figure, Pill } from "../components/ui/Primitives";
import { Bell, Check, CheckCheck, Trash2, Filter, Settings, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { markAsRead, markAllAsRead, deleteNotification } from "../services/notification.service";
import { useFinancialEngine, QUERY_KEYS } from "../services/financial.engine";

const kindTone = {
  expense: "vermilion",
  settlement: "ledger",
  join: "neutral",
  note: "muted",
  payment: "ledger",
};

const kindLabels = {
  expense: "Expense",
  settlement: "Settlement",
  join: "Join",
  note: "Note",
  payment: "Payment",
};

export default function Notifications() {
  const [filterKind, setFilterKind] = useState("all");
  const [showRead, setShowRead] = useState(true);
  const queryClient = useQueryClient();

  // Use FinancialEngine for notification data
  const engine = useFinancialEngine();
  const notificationSummary = engine.notificationSummary || {};
  const circles = engine.circles || [];
  const isLoading = engine.isLoading;

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });

  const allNotifications = notificationSummary.notifications || [];
  const unreadCount = notificationSummary.unreadCount || 0;

  const filteredNotifications = useMemo(() => {
    let filtered = allNotifications;
    
    if (filterKind !== "all") {
      filtered = filtered.filter(n => n.kind === filterKind);
    }
    
    if (!showRead) {
      filtered = filtered.filter(n => !n.read);
    }

    return filtered;
  }, [allNotifications, filterKind, showRead]);

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 pb-8 border-b border-ink">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
              Drawer · Pings
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.92]">
              Pinned to the <em className="italic">corkboard.</em>
            </h1>
            <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
              Every action that matters, in one place. Expenses, settlements, joins, and notes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-9 px-3 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
            <button className="h-9 px-3 inline-flex items-center gap-2 border border-rule font-mono text-[11px] uppercase tracking-[0.16em] hover:border-ink">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
          >
            <option value="all">All types</option>
            {Object.entries(kindLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}s</option>
            ))}
          </select>

          <button
            onClick={() => setShowRead(!showRead)}
            className={`h-10 px-3 border-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
              showRead ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"
            }`}
          >
            {showRead ? "Showing all" : "Unread only"}
          </button>

          {unreadCount > 0 && (
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-vermilion">
              {unreadCount} unread
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-5 md:px-10 lg:px-14 py-10">
        <div className="grid lg:grid-cols-[1fr_300px] gap-10">
          <div>
            <div className="eyebrow mb-6">Recent notifications</div>
            {isLoading ? (
              <div className="py-16 text-center text-ink-muted">Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="font-display text-2xl mb-2">You're all caught up</div>
                <p className="text-ink-muted">No notifications yet. Start by creating a circle or adding an expense.</p>
              </div>
            ) : (
              <ol className="space-y-0">
                {filteredNotifications.map((a, i) => {
                  const g = circles.find((x) => x.id === a.groupId);
                  return (
                    <li
                      key={a.id}
                      className={`relative grid grid-cols-[auto_1fr_auto] gap-4 items-start py-5 border-b border-rule last:border-0 hover:bg-paper-deep/30 transition px-2 -mx-2 ${
                        !a.read ? "bg-vermilion/5" : ""
                      }`}
                    >
                      {i < filteredNotifications.length - 1 && <div className="absolute left-[31px] top-[52px] bottom-0 w-px bg-rule" />}
                      <div className="relative">
                        <AvatarDot member={{ name: a.actorName || 'A user', initials: (a.actorName || '??').split(' ').map(n => n[0]).join('').slice(0, 2) }} size={40} />
                        {!a.read && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-vermilion border-2 border-paper rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Pill tone={kindTone[a.kind]}>{kindLabels[a.kind] || a.kind}</Pill>
                          {g && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{g.name}</span>}
                        </div>
                        <p className="font-display text-base leading-snug">
                          <span className="font-medium">{a.actorName || 'A user'}</span>
                          <span className="text-ink-muted"> {a.text}</span>
                          {a.amount != null && a.amount > 0 && (
                            <span className="ml-2">
                              <Figure value={a.amount} currency={a.currency} size="sm" />
                            </span>
                          )}
                        </p>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-1.5">
                          {getTimeAgo(a.time)} ago
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!a.read && (
                          <button 
                            onClick={() => markAsReadMutation.mutate(a.id)}
                            disabled={markAsReadMutation.isPending}
                            className="h-8 w-8 grid place-items-center border border-rule hover:border-ink hover:bg-ink hover:text-paper transition disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotificationMutation.mutate(a.id)}
                          disabled={deleteNotificationMutation.isPending}
                          className="h-8 w-8 grid place-items-center border border-rule hover:border-vermilion hover:text-vermilion transition disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <aside>
            <div className="eyebrow mb-4">Summary</div>
            <div className="space-y-3">
              <div className="border border-ink bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">Unread</div>
                <div className="font-display text-4xl">{unreadCount}</div>
              </div>
              <div className="border border-ink bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">Total</div>
                <div className="font-display text-4xl">{allNotifications.length}</div>
              </div>
              <div className="border border-ink bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">Active circles</div>
                <div className="font-display text-4xl">{circles.length}</div>
              </div>
            </div>

            <div className="mt-8 p-5 border border-rule bg-paper">
              <div className="eyebrow mb-3">Notification types</div>
              <div className="space-y-2">
                {Object.entries(kindLabels).map(([kind, label]) => {
                  const count = allNotifications.filter(a => a.kind === kind).length;
                  return (
                    <div key={kind} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={"w-2 h-2 rounded-full " + (kindTone[kind] === "vermilion" ? "bg-vermilion" : kindTone[kind] === "ledger" ? "bg-ledger" : "bg-ink-muted")} />
                        {label}s
                      </span>
                      <span className="font-mono text-xs text-ink-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 p-5 border-2 border-dashed border-rule">
              <div className="eyebrow mb-3">Quick actions</div>
              <div className="space-y-2">
                <button className="w-full h-9 px-3 border border-ink hover:bg-ink hover:text-paper transition font-mono text-[10px] uppercase tracking-[0.14em] flex items-center justify-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Email digest
                </button>
                <button className="w-full h-9 px-3 border border-ink hover:bg-ink hover:text-paper transition font-mono text-[10px] uppercase tracking-[0.14em] flex items-center justify-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" /> Push settings
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return "unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "0d";
  if (diff === 1) return "1d";
  if (diff < 7) return `${diff}d`;
  if (diff < 30) return `${Math.floor(diff / 7)}w`;
  return `${Math.floor(diff / 30)}m`;
}