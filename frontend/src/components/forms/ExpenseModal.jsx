import { useState } from "react";
import { useAuth } from '../../hooks/useAuth';
import { useFinancialEngine } from '../../services/financial.engine';
import { createExpense } from "../../services/expense.service";
import { toast } from "sonner";
import { AvatarDot, Figure } from "../ui/Primitives";
import { X } from "lucide-react";

export default function ExpenseModal({ circleId, personId, onClose, onSuccess }) {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCircles = engine.circles;
  const currentUserId = user?._id || user?.id;
  const currentMemberId = engine.currentMemberId;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const group = userCircles.find((g) => g.id === circleId);
  if (!group) {
    onClose();
    return null;
  }
  const members = group?.members || [];
  const currency = group?.currency || user?.preferences?.currency || "USD";

  // Resolve personId to canonical Member._id
  const resolvedPersonId = personId;
  const resolvedCurrentMemberId = currentMemberId || currentUserId;

  // Find the person object
  const person = members.find((m) => (m._id || m.id) === resolvedPersonId || (m.user?._id) === resolvedPersonId);
  const otherPersonId = resolvedPersonId;

  const handleSubmit = async () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill in title and amount");
      return;
    }
    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      const splitAmount = amountNum / 2; // equal split between two people

      const payload = {
        groupId: circleId,
        title: title.trim(),
        description: title.trim(),
        amount: amountNum,
        currency,
        paidBy: resolvedCurrentMemberId,
        date: new Date().toISOString().split("T")[0],
        splitMethod: "equal",
        splits: [
          { user: resolvedCurrentMemberId, amount: splitAmount },
          { user: otherPersonId, amount: splitAmount },
        ],
        note: note.trim(),
      };

      const created = await createExpense(payload);
      if (created) {
        toast.success("Expense created");
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || "Failed to create expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-paper border-2 border-ink p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-display text-xl">Add Expense</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.16em] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dinner"
              className="w-full bg-paper border-2 border-ink p-3 font-display text-lg focus:outline-none focus:border-vermilion"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.16em] mb-1">Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-paper border-2 border-ink p-3 font-figure text-lg focus:outline-none focus:border-vermilion"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.16em] mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note..."
              className="w-full bg-paper border-2 border-ink p-4 font-display text-sm focus:outline-none focus:border-vermilion resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-paper-deep"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-4 h-10 px-6 inline-flex items-center gap-3 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <span>Add Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}