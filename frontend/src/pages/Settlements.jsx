import { Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AvatarDot, Figure, Stamp, Pill } from "../components/ui/Primitives";
import { createSettlement, confirmSettlement, completeSettlement, cancelSettlement, partialSettlement, getAllSettlements, getSuggestedSettlements } from "../services/settlement.service";
import { useFinancialEngine, QUERY_KEYS } from "../services/financial.engine";
import { ArrowRight, Check, Sparkles, AlertCircle, CheckCircle, RefreshCw, Banknote, Smartphone, CreditCard, XCircle, Undo2, Eye, Send, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function SettlementsPage() {
  const [showConfirm, setShowConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState("suggested");
  const [paymentModal, setPaymentModal] = useState(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [showPartial, setShowPartial] = useState(null);
  const engine = useFinancialEngine();

  const currentUserId = engine.currentUserId;
  // Settlement from/to ids are canonical Member._id values, so identify the
  // current user by Member._id when available (falling back to the User._id).
  const currentMemberId = engine.currentMemberId || engine.currentUserId;
  const userCurrency = engine.userCurrency;

  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value.toString === 'function') return value.toString().trim();
    return String(value).trim();
  };

  // Fetch all settlements from backend
  const { data: allSettlementsData = [], isLoading: settlementsLoading, refetch: refetchSettlements } = useQuery({
    queryKey: QUERY_KEYS.SETTLEMENTS,
    queryFn: getAllSettlements,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch computed settlement suggestions across all of the user's circles.
  // These are derived on-demand by the Financial Engine (never stored), so we
  // must aggregate them per circle to show "you owe X to Y" prompts.
  const { data: computedSuggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['suggested-settlements', (engine.circles || []).map((c) => c.id)],
    queryFn: async () => {
      const circles = engine.circles || [];
      const results = await Promise.all(
        circles.map(async (c) => {
          try {
            const res = await getSuggestedSettlements(c.id);
            return (res.suggestedSettlements || []).map((s) => {
              const fromId = typeof s.from === 'string' ? s.from : (s.from?._id || s.from?.id);
              const toId = typeof s.to === 'string' ? s.to : (s.to?._id || s.to?.id);
              return {
                ...s,
                id: `suggested-${c.id}-${fromId}-${toId}`,
                circleId: c.id,
                circleName: c.name,
                fromId,
                toId,
                fromUser: s.from,
                toUser: s.to,
                fromName: s.from?.name,
                toName: s.to?.name,
                currency: s.currency || c.currency || 'USD',
                status: 'suggested',
              };
            });
          } catch {
            return [];
          }
        })
      );
      return results.flat().filter((s) => s.fromId && s.toId && s.fromId !== s.toId && s.amount > 0);
    },
    enabled: !!(engine.circles && engine.circles.length),
    staleTime: 30 * 1000,
  });

  // Categorize settlements by status
  const suggestions = useMemo(() => {
    const stored = (allSettlementsData || []).filter(
      (s) => s.status === 'suggested' || s.status === 'pending_suggestion'
    );
    const computed = (computedSuggestions || []).filter(
      (cs) => !stored.some(
        (st) => st.circleId === cs.circleId && st.from === cs.fromId && st.to === cs.toId
      )
    );
    return [...computed, ...stored];
  }, [allSettlementsData, computedSuggestions]);

  const pending = useMemo(() => {
    return (allSettlementsData || []).filter(s => s.status === 'pending');
  }, [allSettlementsData]);

  const completed = useMemo(() => {
    return (allSettlementsData || []).filter(s => s.status === 'completed' || s.status === 'confirmed');
  }, [allSettlementsData]);

  const cancelled = useMemo(() => {
    return (allSettlementsData || []).filter(s => s.status === 'cancelled' || s.status === 'expired');
  }, [allSettlementsData]);

  // Settlement mutations
  const createSettlementMutation = useMutation({
    mutationFn: ({ circleId, to, amount, method }) =>
      createSettlement({ circleId, to, amount, paymentMethod: method || 'cash', title: 'Settlement' }),
    onSuccess: () => {
      engine.refreshAfterAction('SETTLEMENT_PAID');
      toast.success("Payment recorded");
    },
    onError: (err) => toast.error(err.message || "Failed to record payment"),
  });

  const confirmSettlementMutation = useMutation({
    mutationFn: (settlementId) => confirmSettlement(settlementId),
    onSuccess: () => {
      engine.refreshAfterAction('SETTLEMENT_CONFIRMED');
      toast.success("Settlement confirmed");
    },
    onError: (err) => toast.error(err.message || "Failed to confirm"),
  });

  const completeSettlementMutation = useMutation({
    mutationFn: completeSettlement,
    onSuccess: () => {
      engine.refreshAfterAction('SETTLEMENT_COMPLETED');
      toast.success("Settlement completed");
    },
    onError: (err) => toast.error(err.message || "Failed to complete"),
  });

  const cancelSettlementMutation = useMutation({
    mutationFn: cancelSettlement,
    onSuccess: () => {
      engine.refreshAfterAction('SETTLEMENT_CANCELLED');
      toast.success("Settlement cancelled");
    },
    onError: (err) => toast.error(err.message || "Failed to cancel"),
  });

  const partialSettlementMutation = useMutation({
    mutationFn: ({ settlementId, amount }) => partialSettlement(settlementId, amount),
    onSuccess: () => {
      engine.refreshAfterAction('SETTLEMENT_PAID');
      toast.success("Partial payment recorded");
      setShowPartial(null);
      setPartialAmount("");
    },
    onError: (err) => toast.error(err.message || "Failed to process partial payment"),
  });

  const handleSettle = async (suggestion, method) => {
    try {
      await createSettlementMutation.mutateAsync({
        circleId: suggestion.circleId,
        to: suggestion.toId || suggestion.to?.id,
        amount: suggestion.amount,
        method,
      });
      setPaymentModal(null);
      setShowConfirm(null);
    } catch (err) {
      // Error handled in mutation
    }
  };

  const handlePartialPay = async (settlementId) => {
    const amt = parseFloat(partialAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await partialSettlementMutation.mutateAsync({ settlementId, amount: amt });
  };

  const isLoading = engine.isLoading || settlementsLoading || suggestionsLoading;

  const PaymentMethodSelector = ({ onSelect, amount, currency }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => { setSelectedMethod('cash'); onSelect('cash'); }}
          className={`h-12 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
            selectedMethod === 'cash' ? 'border-ink bg-card' : 'border-rule hover:border-ink'
          }`}
        >
          <Banknote className="h-4 w-4" />
          Cash
        </button>
        <button
          onClick={() => { setSelectedMethod('upi'); onSelect('upi'); }}
          className={`h-12 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
            selectedMethod === 'upi' ? 'border-ink bg-card' : 'border-rule hover:border-ink'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          UPI
        </button>
        <button
          onClick={() => { setSelectedMethod('bank_transfer'); onSelect('bank_transfer'); }}
          className={`h-12 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
            selectedMethod === 'bank_transfer' ? 'border-ink bg-card' : 'border-rule hover:border-ink'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Bank
        </button>
      </div>
    </div>
  );

  const renderSettlementActions = (s, isSuggested = false, isPending = false) => {
    const fromId = normalizeId(s.fromId || s.from?._id || s.from?.id);
    const toId = normalizeId(s.toId || s.to?._id || s.to?.id);
    const isCurrentUserPayer = fromId === currentMemberId;
    const isCurrentUserReceiver = toId === currentMemberId;

    return (
      <div className="flex flex-wrap gap-2 mt-3 ml-12">
        {isSuggested && isCurrentUserPayer && (
          <>
            <button
              onClick={() => {
                setSelectedMethod('cash');
                setShowConfirm(s.id);
              }}
              className="h-8 px-3 bg-ledger text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Record Payment
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setSelectedMethod('cash');
                  handleSettle(s, 'cash');
                }}
                className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                title="Record Cash Payment"
              >
                <Banknote className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedMethod('upi');
                  handleSettle(s, 'upi');
                }}
                className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                title="Record UPI Payment"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedMethod('bank_transfer');
                  handleSettle(s, 'bank_transfer');
                }}
                className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition"
                title="Record Bank Transfer"
              >
                <CreditCard className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
        {isPending && (
          <>
            {isCurrentUserReceiver && (
              <button
                onClick={() => confirmSettlementMutation.mutate(s.id)}
                disabled={confirmSettlementMutation.isPending}
                className="h-8 px-3 bg-ledger text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ink transition flex items-center gap-1"
              >
                <CheckCircle className="h-3 w-3" /> Confirm Payment
              </button>
            )}
            {isCurrentUserPayer && (
              <>
                <button
                  onClick={() => completeSettlementMutation.mutate(s.id)}
                  disabled={completeSettlementMutation.isPending}
                  className="h-8 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ledger transition flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" /> Mark Paid
                </button>
                <button
                  onClick={() => {
                    setShowPartial(s.id);
                    setPartialAmount(String(s.remainingAmount || s.amount / 2));
                  }}
                  className="h-8 px-3 border border-ink font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition flex items-center gap-1"
                >
                  <DollarSign className="h-3 w-3" /> Partial
                </button>
              </>
            )}
            {isCurrentUserPayer && (
              <button
                onClick={() => {
                  if (confirm('Cancel this settlement?')) cancelSettlementMutation.mutate(s.id);
                }}
                disabled={cancelSettlementMutation.isPending}
                className="h-8 px-3 border border-vermilion text-vermilion font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-vermilion/10 transition flex items-center gap-1"
              >
                <XCircle className="h-3 w-3" /> Cancel
              </button>
            )}
            <button
              onClick={() => toast.info("Reminder sent to " + (isCurrentUserPayer ? s.toName : s.fromName))}
              className="h-8 w-8 border border-rule grid place-items-center hover:bg-paper-deep transition"
              title="Send Reminder"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderSettlementItem = (s, isSuggested = false, isPending = false) => {
    const fromUser = typeof s.from === 'object' ? s.from : { name: s.fromName || 'A user' };
    const toUser = typeof s.to === 'object' ? s.to : { name: s.toName || 'A user' };
    const remaining = s.remainingAmount || s.amount || 0;
    const isPartial = remaining < s.amount;

    return (
      <div key={s.id} className="border border-ink bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AvatarDot member={fromUser} size={36} />
            <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">→</div>
            <AvatarDot member={toUser} size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">
              {fromUser.name?.split(" ")[0] || s.fromName?.split(" ")[0]} → {toUser.name?.split(" ")[0] || s.toName?.split(" ")[0]}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-1">
              {s.circleName || ''} · {isPending ? 'Pending' : isSuggested ? 'Suggested' : 'Completed'}
              {s.paymentMethod && s.paymentMethod !== 'other' && ` · via ${s.paymentMethod.replace('_', ' ')}`}
            </div>
            {s.note && (
              <div className="font-mono text-[10px] text-ink-muted mt-1 italic">
                "{s.note}"
              </div>
            )}
            {isPartial && (
              <div className="mt-1">
                <Pill tone="vermilion" className="text-[9px]">Partially paid ({remaining}/{s.amount})</Pill>
              </div>
            )}
          </div>
          <div className="text-right">
            <Figure value={s.amount} currency={s.currency || userCurrency} size="lg" tone={isPending ? "vermilion" : "ledger"} />
          </div>
        </div>

        {/* Relationship explanation */}
        <div className="mt-2 ml-12 font-mono text-[11px] text-ink-soft">
          {isSuggested && `${s.fromName?.split(" ")[0]} owes ${s.toName?.split(" ")[0]} `}
          <Figure value={s.amount} currency={s.currency || userCurrency} size="sm" />
        </div>

        {isSuggested && renderSettlementActions(s, true, false)}
        {isPending && renderSettlementActions(s, false, true)}

        {/* Partial payment form */}
        {showPartial === s.id && isPending && (
          <div className="mt-4 ml-12 p-4 border border-ink bg-paper-deep">
            <div className="font-display text-base mb-3">Partial Payment</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="Amount"
                className="h-10 px-3 border-2 border-ink bg-card font-display text-sm w-32 focus:outline-none focus:border-vermilion"
                step="0.01"
                min="0.01"
                max={s.remainingAmount || s.amount}
              />
              <div className="font-mono text-[10px] text-ink-muted">
                Remaining: <Figure value={s.remainingAmount || s.amount} currency={s.currency || userCurrency} size="sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handlePartialPay(s.id)}
                disabled={partialSettlementMutation.isPending}
                className="h-8 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-ledger transition"
              >
                {partialSettlementMutation.isPending ? "Processing..." : "Record Partial"}
              </button>
              <button
                onClick={() => { setShowPartial(null); setPartialAmount(""); }}
                className="h-8 px-3 border border-ink font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-paper-deep transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Total outstanding across all circles
  const totalOutstanding = useMemo(() => {
    return suggestions.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [suggestions]);

  const activeItems = activeTab === "suggested" ? suggestions :
    activeTab === "pending" ? pending :
    activeTab === "completed" ? completed :
    cancelled;

  const isEmpty = activeItems.length === 0;

  const tabItems = [
    { id: "suggested", label: "Suggested", count: suggestions.length, tone: "ledger" },
    { id: "pending", label: "Pending", count: pending.length, tone: "vermilion" },
    { id: "completed", label: "Completed", count: completed.length, tone: "ledger" },
    { id: "cancelled", label: "Cancelled", count: cancelled.length, tone: "muted" },
  ];

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading settlements&hellip;
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
          Drawer · Reconcile
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
              Everybody <em className="italic">settles.</em>
            </h1>
            <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
              Suggested settlements, pending payments, and completed transactions across all your circles.
            </p>
          </div>
          <button
            onClick={() => refetchSettlements()}
            className="h-9 px-3 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Suggested</div>
            <div className="font-display text-4xl text-ledger">{suggestions.length}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Awaiting action
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Pending</div>
            <div className="font-display text-4xl text-vermilion">{pending.length}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Awaiting confirmation
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Completed</div>
            <div className="font-display text-4xl text-ledger">{completed.length}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              All time
            </div>
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Cancelled</div>
            <div className="font-display text-4xl text-ink-muted">{cancelled.length}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-2">
              Rejected or expired
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 md:px-10 lg:px-14 border-b border-ink bg-paper-deep/30">
        <div className="flex">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                "flex items-center gap-2 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] border-b-2 transition " +
                (activeTab === tab.id ? "border-ink bg-card" : "border-transparent hover:border-rule")
              }
            >
              <span className={`w-2 h-2 rounded-full ${tab.tone === 'ledger' ? 'bg-ledger' : tab.tone === 'vermilion' ? 'bg-vermilion' : 'bg-ink-muted'}`} />
              {tab.label}
              <span className="text-ink-muted">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 md:px-10 lg:px-14 py-10">
        {isEmpty ? (
          <div className="py-16 text-center">
            {activeTab === "suggested" && (
              <>
                <CheckCircle className="h-12 w-12 text-ledger mx-auto mb-4" />
                <div className="font-display text-2xl mb-2">Everyone is fully settled.</div>
                <p className="text-ink-muted">No debts remain. All balances are squared away.</p>
                <p className="text-ink-muted text-sm mt-2">Create another expense to continue tracking.</p>
              </>
            )}
            {activeTab === "pending" && (
              <>
                <div className="font-display text-2xl mb-2">No pending settlements</div>
                <p className="text-ink-muted">All suggested settlements have been processed. There are currently no pending settlement suggestions because every member has already paid their share.</p>
              </>
            )}
            {activeTab === "completed" && (
              <>
                <div className="font-display text-2xl mb-2">No completed settlements</div>
                <p className="text-ink-muted">Complete a settlement to see it here. Go to the Suggested tab to start.</p>
              </>
            )}
            {activeTab === "cancelled" && (
              <>
                <div className="font-display text-2xl mb-2">No cancelled settlements</div>
                <p className="text-ink-muted">Cancelled settlements will appear here. When a settlement is cancelled, it's moved here for reference.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeItems.map((s) => renderSettlementItem(
              s,
              activeTab === "suggested",
              activeTab === "pending"
            ))}
          </div>
        )}

        {/* Completed Section - Detailed */}
        {activeTab === "completed" && completed.length > 0 && (
          <div className="mt-10">
            <h3 className="font-display text-2xl mb-4">Completed Settlement Details</h3>
            <div className="border border-ink bg-card overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ink bg-paper-deep">
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Amount</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Payer</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Receiver</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Method</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Date</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Circle</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Ref ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {completed.map((s) => (
                    <tr key={s.id} className="hover:bg-paper-deep/40 transition">
                      <td className="px-4 py-3"><Figure value={s.amount} currency={s.currency || userCurrency} size="sm" tone="ledger" /></td>
                      <td className="px-4 py-3 font-display text-sm">{s.fromName}</td>
                      <td className="px-4 py-3 font-display text-sm">{s.toName}</td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">{s.paymentMethod?.replace('_', ' ') || 'other'}</td>
                      <td className="px-4 py-3 font-mono text-[10px]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 font-mono text-[10px]">{s.circleName}</td>
                      <td className="px-4 py-3 font-mono text-[9px] text-ink-muted">{s.id?.slice(-8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settlement Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={() => setShowConfirm(null)}>
            <div className="bg-paper border-2 border-ink p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="font-display text-2xl mb-4">Record Payment</div>
              <p className="text-ink-soft mb-4">Select payment method and confirm this settlement.</p>
              
              <div className="mb-6">
                <div className="eyebrow mb-3">Payment Method</div>
                <PaymentMethodSelector
                  onSelect={(method) => setSelectedMethod(method)}
                  amount={0}
                  currency={userCurrency}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 h-10 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-paper-deep"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const s = activeItems.find(x => x.id === showConfirm);
                    if (s) handleSettle(s, selectedMethod);
                  }}
                  className="flex-1 h-10 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion"
                  disabled={createSettlementMutation.isPending}
                >
                  {createSettlementMutation.isPending ? "Processing..." : `Pay via ${selectedMethod.replace('_', ' ')}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}