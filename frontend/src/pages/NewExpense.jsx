import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import { AvatarDot, Figure, Stamp } from "../components/ui/Primitives";
import { useAuth } from "../hooks/useAuth";
import { useInvalidateAll } from "../hooks/useInvalidate";
import { useFinancialEngine } from "../services/financial.engine";
import { createExpense } from "../services/expense.service";
import { getSymbol } from "../services/currency.service";
import { calculateSplit, previewSettlements } from "../services/split-calc";
import {
  ArrowLeft,
  Check,
  Upload,
  Calendar,
  Plus,
  ChevronRight,
  ChevronLeft,
  Receipt as ReceiptIcon,
  AlertTriangle,
  Sparkles,
  Scale,
  Wallet,
} from "lucide-react";

const SAMPLES = [
  "Dinner at restaurant, 84.50, split with friends",
  "Monthly rent 4200 split equally",
  "Cabin weekend 980 for the group",
];

const CATEGORIES = [
  "Food & drink",
  "Lodging",
  "Transport",
  "Groceries",
  "Utilities",
  "Rent",
  "Gifts",
  "Entertainment",
  "Shopping",
  "Other",
];

const SPLIT_METHODS = [
  { id: "equal", label: "Equal", desc: "Split equally among all participants" },
  { id: "percentage", label: "Percentage", desc: "Assign a percentage to each person" },
  { id: "exact", label: "Exact Amount", desc: "Enter the exact amount each owes" },
  { id: "shares", label: "Shares", desc: "Weight the split by shares" },
  { id: "custom", label: "Custom", desc: "Free-form amounts that total the expense" },
];

const STEPS = ["Circle", "Details", "Payer", "Participants", "Split", "Preview"];

function parse(input, currentUserId, members = [], userCurrency = "USD") {
  const amountMatch = input.match(/[€$£]?\s*(\d+(?:[.,]\d{1,2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;
  const currency = userCurrency;
  const rawDescription = amountMatch
    ? input.slice(0, amountMatch.index).replace(/[,·\-—]\s*$/, "").trim()
    : input.trim();
  const description = rawDescription.length >= 2 ? rawDescription : input.trim();
  const mentioned = members.filter(
    (m) =>
      m.id !== currentUserId &&
      new RegExp(`\\b${m.name?.split(" ")[0] || ""}\\b`, "i").test(input)
  );
  const currentUser = currentUserId
    ? { id: currentUserId, name: "You", handle: "@you", initials: "YO", hue: 36 }
    : null;
  const participants = currentUser ? [currentUser, ...mentioned] : [...mentioned];
  const lower = input.toLowerCase();
  const category = /rent|utility|utilities|internet/.test(lower)
    ? "Household"
    : /dinner|lunch|breakfast|coffee|drink|restaurant|cafe|cervejaria/.test(lower)
    ? "Food & drink"
    : /cabin|airbnb|hotel|stay/.test(lower)
    ? "Lodging"
    : /uber|taxi|flight|train|rental|fiat|car/.test(lower)
    ? "Transport"
    : /groceries|grocery|supermarket/.test(lower)
    ? "Groceries"
    : "Other";
  return { amount, currency, description, participants, category };
}

function decorate(member, currentMemberId) {
  const name = member.name || "A user";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = Math.abs(
    (member.id || name).split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  );
  return {
    ...member,
    name,
    initials: member.id === currentMemberId ? "YO" : initials,
    hue: member.id === currentMemberId ? 36 : hue,
  };
}

export default function NewExpense() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const invalidateAll = useInvalidateAll();
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const engine = useFinancialEngine();
  const userCircles = engine.circles;
  const [groupId, setGroupId] = useState(userCircles[0]?.id || "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [splitMethod, setSplitMethod] = useState("equal");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [merchant, setMerchant] = useState("");
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [paidBy, setPaidBy] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [splitValues, setSplitValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef(null);

  const currentUserId = user?._id || user?.id;
  const group = userCircles.find((g) => g.id === groupId);
  const members = useMemo(
    () => (group?.members || []).map((m) => decorate(m, currentUserId)),
    [group, currentUserId]
  );
  const currentMemberId = useMemo(() => {
    const myMember = members.find(m => m.user?._id === currentUserId || m.id === currentUserId);
    return myMember?.id || currentUserId || "";
  }, [members, currentUserId]);

  const effectivePaidBy = paidBy || currentUserId;
  const effectiveParticipants = participantIds.length
    ? participantIds
    : members.map((m) => m.id);

  const parsed = useMemo(
    () => parse(text, currentMemberId, members, group?.currency || user?.preferences?.currency || "USD"),
    [text, currentMemberId, members, group, user]
  );

  const numericAmount = parseFloat(amount) || parsed.amount || 0;
  const displayTitle = title.trim() || parsed.description;
  const displayCategory = selectedCategory || parsed.category;
  const currency = group?.currency || user?.preferences?.currency || "USD";

  const splitInput = useMemo(
    () =>
      effectiveParticipants.map((pid) => {
        const v = splitValues[pid] || {};
        return { user: pid, amount: v.amount, percentage: v.percentage, shares: v.shares };
      }),
    [effectiveParticipants, splitValues]
  );

  const splitResult = useMemo(
    () => calculateSplit(numericAmount, splitMethod, splitInput),
    [numericAmount, splitMethod, splitInput]
  );

  const settlementPreview = useMemo(() => {
    if (!splitResult.success) return [];
    const balances = {};
    members.forEach((m) => {
      balances[m.id] = { id: m.id, name: m.name, balance: 0 };
    });
    if (balances[effectivePaidBy]) balances[effectivePaidBy].balance += numericAmount;
    splitResult.splits.forEach((s) => {
      if (balances[s.user]) balances[s.user].balance -= s.amount;
    });
    return previewSettlements(Object.values(balances));
  }, [splitResult, members, effectivePaidBy, numericAmount]);

  const totalAllocated = splitResult.summary?.allocatedAmount || 0;
  const isBalanced = splitResult.success && Math.abs(totalAllocated - numericAmount) < 0.01;

  const canContinue = useMemo(() => {
    if (step === 0) return !!groupId;
    if (step === 1) return numericAmount > 0 && displayTitle.length >= 2;
    if (step === 2) return !!effectivePaidBy && members.some((m) => m.id === effectivePaidBy);
    if (step === 3) return effectiveParticipants.length > 0;
    if (step === 4) return splitResult.success;
    return true;
  }, [step, groupId, numericAmount, displayTitle, effectivePaidBy, members, effectiveParticipants, splitResult]);

  const toggleParticipant = (id) =>
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const selectAllParticipants = () => setParticipantIds(members.map((m) => m.id));
  const clearParticipants = () => setParticipantIds([]);
  const updateSplitValue = (id, key, value) =>
    setSplitValues((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  const memberName = (id) => members.find((m) => m.id === id)?.name || "A user";

  const handleSubmit = async () => {
    if (!isBalanced || !groupId) {
      toast.error("Please fix the split before saving.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        groupId,
        title: displayTitle,
        description: displayTitle,
        amount: numericAmount,
        currency,
        paidBy: effectivePaidBy,
        category: displayCategory,
        date,
        splitMethod,
        note,
        merchant,
        splits: splitResult.splits.map((s) => ({
          user: s.user,
          amount: s.amount,
          percentage: s.percentage,
          shares: s.shares,
        })),
      };
      const created = await createExpense(payload);
      if (receiptFile && created?.id) {
        try {
          const fd = new FormData();
          fd.append("receipt", receiptFile);
          await fetch(`/api/expenses/${created.id}/receipt`, {
            method: "POST",
            body: fd,
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
        } catch {
          /* non-fatal */
        }
      }
      await invalidateAll();
      toast.success("Expense filed. Every workspace updated.");
      navigate(`/app/expenses/${created?.id || ""}`);
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || "Failed to create expense";
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-88px)] grid lg:grid-cols-[1.15fr_1fr]">
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-14 border-r border-ink ruled-paper">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/app/ledger"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to ledger
          </Link>
          <Stamp className={step === 5 ? "text-vermilion" : "text-ink-muted"}>
            Step {step + 1} / {STEPS.length} · {STEPS[step]}
          </Stamp>
        </div>

        <div className="flex items-center gap-1 mb-10 overflow-x-auto">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => i < step && setStep(i)}
              className={
                "flex items-center gap-1.5 px-2.5 py-1.5 border text-[10px] font-mono uppercase tracking-[0.12em] whitespace-nowrap transition " +
                (i === step ? "border-ink bg-ink text-paper" : i < step ? "border-rule text-ink hover:border-ink" : "border-rule text-ink-muted")
              }
            >
              <span
                className={
                  "inline-grid place-items-center h-4 w-4 rounded-full text-[9px] " + (i < step ? "bg-ledger text-paper" : "bg-paper-deep")
                }
              >
                {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
              Choose a <em className="italic">circle.</em>
            </h1>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              Every expense belongs to a circle. Pick where this money was spent.
            </p>
            {userCircles.length === 0 ? (
              <div className="border-2 border-dashed border-rule p-6 text-center mt-8">
                <p className="text-ink-muted mb-3">You haven't created any circles yet.</p>
                <Link
                  to="/app/circles/new"
                  className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Create your first circle
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 mt-8">
                {userCircles.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGroupId(g.id);
                      setPaidBy(currentMemberId);
                      setParticipantIds([]);
                      setSplitValues({});
                    }}
                    className={
                      "px-4 py-3 border text-left transition " +
                      (groupId === g.id ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink")
                    }
                  >
                    <div className="font-display text-base">{g.name}</div>
                    <div
                      className={
                        "text-[10px] font-mono uppercase tracking-[0.16em] mt-1 " +
                        (groupId === g.id ? "text-paper/70" : "text-ink-muted")
                      }
                    >
                      {g.memberCount || 0} members · {g.currency}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
              Expense <em className="italic">information.</em>
            </h1>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              What was it, how much, and when? You can also describe it in plain English.
            </p>
            <div className="mt-8 space-y-6">
              <div>
                <label className="eyebrow block mb-3">Quick entry</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Dinner at Ramiro, 84.50, split with Lena and Marco"
                  className="w-full bg-paper border-2 border-ink p-4 font-display text-lg leading-snug focus:outline-none focus:border-vermilion resize-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {SAMPLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setText(s)}
                      className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 border border-rule text-ink-muted hover:bg-ink hover:text-paper hover:border-ink"
                    >
                      Sample
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-3">Title</label>
                <input
                  value={displayTitle}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner at Ramiro"
                  className="w-full bg-paper border-2 border-ink p-3 font-display text-lg focus:outline-none focus:border-vermilion"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow block mb-3">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount || ""}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-paper border-2 border-ink p-3 font-figure text-lg focus:outline-none focus:border-vermilion"
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-3">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-[42px] pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-3">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={
                        "px-3 py-2 border text-left text-sm transition " +
                        (displayCategory === cat ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink")
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow block mb-3">Merchant (optional)</label>
                  <input
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Ramiro"
                    className="w-full bg-paper border-2 border-ink p-3 font-display text-sm focus:outline-none focus:border-vermilion"
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-3">Receipt (optional)</label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={
                      "w-full px-3 py-2.5 border-2 border-dashed text-left text-sm transition " +
                      (hasReceipt ? "border-ink bg-ink/5" : "border-rule hover:border-ink")
                    }
                  >
                    <Upload className="h-4 w-4 inline mr-2" />
                    {hasReceipt ? receiptFile?.name || "Receipt attached" : "Click to upload"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setReceiptFile(f);
                        setHasReceipt(true);
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-3">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note..."
                  className="w-full bg-paper border-2 border-ink p-4 font-display text-sm focus:outline-none focus:border-vermilion resize-none"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
              Who <em className="italic">paid?</em>
            </h1>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              Select the member who covered this expense. Only circle members can be the payer.
            </p>
            <div className="mt-8 space-y-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaidBy(m.id)}
                  className={
                    "w-full px-4 py-3 border flex items-center gap-3 text-left transition " +
                    (effectivePaidBy === m.id ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink")
                  }
                >
                  <AvatarDot member={m} size={28} />
                  <span className="font-display text-base flex-1">{m.name}</span>
                  {m.id === currentMemberId && (
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-70">You</span>
                  )}
                  {effectivePaidBy === m.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
                Who <em className="italic">participated?</em>
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={selectAllParticipants}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 border border-rule hover:border-ink"
                >
                  Everyone
                </button>
                <button
                  onClick={clearParticipants}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 border border-rule hover:border-ink"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              Check everyone who shares this expense. Unchecked members won't owe anything.
            </p>
            <div className="mt-8 space-y-2">
              {members.map((m) => {
                const checked = effectiveParticipants.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleParticipant(m.id)}
                    className={
                      "w-full px-4 py-3 border flex items-center gap-3 text-left transition " +
                      (checked ? "border-ink bg-ink/5" : "border-rule hover:border-ink")
                    }
                  >
                    <span className={"h-5 w-5 grid place-items-center border " + (checked ? "bg-ink border-ink text-paper" : "border-rule")}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <AvatarDot member={m} size={28} />
                    <span className="font-display text-base flex-1">{m.name}</span>
                    {m.id === currentMemberId && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">You</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {effectiveParticipants.length} of {members.length} selected
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
              How to <em className="italic">split?</em>
            </h1>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              Choose a method and set each person's share. Totals are validated live.
            </p>

            <div className="mt-8 space-y-2">
              {SPLIT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSplitMethod(method.id);
                    setSplitValues({});
                  }}
                  className={
                    "w-full px-4 py-3 border text-left transition " +
                    (splitMethod === method.id ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink")
                  }
                >
                  <div className="font-display text-base">{method.label}</div>
                  <div
                    className={
                      "text-[10px] font-mono uppercase tracking-[0.14em] mt-0.5 " +
                      (splitMethod === method.id ? "text-paper/70" : "text-ink-muted")
                    }
                  >
                    {method.desc}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 border border-ink bg-card p-5">
              <div className="eyebrow mb-4">
                {splitMethod === "equal"
                  ? "Equal split"
                  : splitMethod === "percentage"
                  ? "Percentages (must total 100%)"
                  : splitMethod === "exact"
                  ? "Exact amounts (must total the expense)"
                  : splitMethod === "shares"
                  ? "Shares (relative weights)"
                  : "Custom amounts (must total the expense)"}
              </div>
              <div className="space-y-3">
                {effectiveParticipants.map((pid) => {
                  const m = members.find((x) => x.id === pid);
                  const v = splitValues[pid] || {};
                  const isPct = splitMethod === "percentage";
                  const isExact = splitMethod === "exact" || splitMethod === "custom";
                  const isShares = splitMethod === "shares";
                  return (
                    <div key={pid} className="flex items-center gap-3">
                      <AvatarDot member={m} size={26} />
                      <span className="text-sm flex-1">{m?.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            isPct ? v.percentage ?? "" : isExact ? v.amount ?? "" : isShares ? v.shares ?? "" : ""
                          }
                          placeholder={splitMethod === "equal" ? "auto" : "0"}
                          disabled={splitMethod === "equal"}
                          onChange={(e) =>
                            updateSplitValue(
                              pid,
                              isPct ? "percentage" : isExact ? "amount" : "shares",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 h-9 px-2 border-2 border-ink bg-paper text-right font-figure text-sm focus:outline-none focus:border-vermilion disabled:bg-paper-deep disabled:text-ink-muted"
                        />
                        <span className="text-[10px] font-mono uppercase text-ink-muted w-8">
                          {isPct ? "%" : isShares ? "sh" : currency}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Allocated</span>
                <span className={"font-figure text-sm " + (isBalanced ? "text-ledger" : "text-vermilion")}>
                  {getSymbol(currency)}
                  {totalAllocated.toFixed(2)} / {numericAmount.toFixed(2)}
                </span>
              </div>
              {!splitResult.success && splitResult.error && (
                <div className="mt-3 flex items-center gap-2 text-vermilion text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" /> {splitResult.error}
                </div>
              )}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">
              Review before <em className="italic">filing.</em>
            </h1>
            <p className="mt-4 text-ink-soft text-[15px] max-w-md">
              Nothing is saved until validation passes. Confirm the breakdown below.
            </p>

            <div className="mt-8 space-y-4">
              <div className="border border-ink bg-card p-5">
                <div className="eyebrow mb-2">Expense</div>
                <div className="font-display text-xl">{displayTitle || "No title"}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted mt-1">
                  {displayCategory} · {group?.name} · {date}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-ink bg-card p-5">
                  <div className="eyebrow mb-2">Total</div>
                  <Figure value={numericAmount} currency={currency} size="lg" tone="ink" />
                </div>
                <div className="border border-ink bg-card p-5">
                  <div className="eyebrow mb-2">Paid by</div>
                  <div className="flex items-center gap-2">
                    <AvatarDot member={members.find((m) => m.id === effectivePaidBy)} size={24} />
                    <span className="font-display text-base">{memberName(effectivePaidBy)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-ink bg-card p-5">
                <div className="eyebrow mb-3">Individual shares ({effectiveParticipants.length})</div>
                <div className="space-y-2">
                  {splitResult.splits.map((s) => (
                    <div key={s.user} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AvatarDot member={members.find((m) => m.id === s.user)} size={22} />
                        <span className="text-sm">{memberName(s.user)}</span>
                      </div>
                      <span className="font-figure text-sm">
                        {getSymbol(currency)}
                        {s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-ink bg-card p-5">
                <div className="eyebrow mb-3 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Settlement preview
                </div>
                {settlementPreview.length === 0 ? (
                  <div className="text-sm text-ink-muted italic">Everyone is settled for this expense.</div>
                ) : (
                  <div className="space-y-2">
                    {settlementPreview.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="font-medium">{s.from.name}</span>
                          <span className="text-ink-muted"> → </span>
                          <span className="font-medium">{s.to.name}</span>
                        </span>
                        <span className="font-figure">
                          {getSymbol(currency)}
                          {s.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {note && (
                <div className="border border-ink bg-card p-5">
                  <div className="eyebrow mb-2">Note</div>
                  <div className="text-sm italic">"{note}"</div>
                </div>
              )}

              {!isBalanced && (
                <div className="flex items-center gap-2 text-vermilion text-sm border-2 border-vermilion bg-vermilion/5 p-3">
                  <AlertTriangle className="h-4 w-4" /> Split does not balance. Go back to fix it.
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-10 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-12 px-5 inline-flex items-center gap-2 border-2 border-ink font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink hover:text-paper transition"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
              className="h-12 px-6 inline-flex items-center gap-3 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isBalanced}
              className="h-12 px-6 inline-flex items-center gap-3 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> File this expense
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-14 bg-paper-deep/50">
        <div className="eyebrow mb-4 flex items-center gap-2">
          <ReceiptIcon className="h-3.5 w-3.5" /> Live preview
        </div>

        <div className="max-w-md mx-auto bg-card border-x border-ink perf-top perf-bottom border-y-0 px-7 pt-10 pb-12 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
            ExpenseFlow · folio · entry
          </div>
          <div className="text-center font-display text-3xl mt-3 leading-tight">
            {displayTitle || <span className="text-ink-muted italic">No title yet</span>}
          </div>
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mt-2">
            {displayCategory} · {group?.name || "—"}
          </div>

          <div className="my-8 border-t border-dashed border-ink" />

          <div className="text-center">
            <Figure value={numericAmount} currency={currency} size="xl" tone="ink" />
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-2">
              total · paid by {memberName(effectivePaidBy)}
            </div>
          </div>

          <div className="my-8 border-t border-dashed border-ink" />

          <div className="space-y-2.5">
            <div className="eyebrow text-center mb-3">
              {splitMethod === "equal"
                ? "Equal split"
                : splitMethod === "percentage"
                ? "By percentage"
                : splitMethod === "exact"
                ? "Exact amounts"
                : splitMethod === "shares"
                ? "By shares"
                : "Custom split"}{" "}
              ({effectiveParticipants.length})
            </div>
            {splitResult.success ? (
              splitResult.splits.map((s) => (
                <div key={s.user} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AvatarDot member={members.find((m) => m.id === s.user)} size={22} />
                    <span className="text-sm">{memberName(s.user)}</span>
                  </div>
                  <span className="font-figure text-sm">
                    {getSymbol(currency)}
                    {s.amount.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-ink-muted text-sm italic">
                {numericAmount > 0 ? "Set participants and split to preview." : "Enter an amount to preview."}
              </div>
            )}
          </div>

          <div className="my-8 border-t border-dashed border-ink" />

          <div className="font-mono text-[10px] text-ink-muted text-center leading-relaxed">
            REF · staged {new Date().toLocaleString()}
            <br />
            METHOD · {splitMethod}
            <br />
            CURRENCY · {currency}
          </div>
        </div>

        {settlementPreview.length > 0 && (
          <div className="mt-8 max-w-md mx-auto border border-ink bg-card p-5">
            <div className="eyebrow mb-3 flex items-center gap-2">
              <Scale className="h-3.5 w-3.5" /> Who owes whom (preview)
            </div>
            <div className="space-y-2">
              {settlementPreview.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-ink-muted" />
                    <span className="font-medium">{s.from.name}</span>
                    <span className="text-ink-muted">→</span>
                    <span className="font-medium">{s.to.name}</span>
                  </span>
                  <span className="font-figure">
                    {getSymbol(currency)}
                    {s.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center max-w-md mx-auto">
          <p className="font-display text-lg italic text-ink-muted">
            "{displayTitle || "Your expense"}" — to be split with{" "}
            {effectiveParticipants
              .filter((p) => p !== currentMemberId)
              .map((p) => memberName(p).split(" ")[0])
              .join(" & ") || "yourself only"}.
          </p>
        </div>
      </div>
    </div>
  );
}
