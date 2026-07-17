import { useState } from "react";
import { useAuth } from '../../hooks/useAuth';
import { useFinancialEngine } from '../../services/financial.engine';
import { createSettlement } from '../../services/settlement.service';
import { toast } from "sonner";
import { Banknote, Smartphone, CreditCard, X } from "lucide-react";

export default function RequestPaymentModal({ circleId, personId, onClose, onSuccess }) {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCircles = engine.circles;
  const currentUserId = user?._id || user?.id;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const group = userCircles.find((g) => g.id === circleId);
  if (!group) {
    onClose();
    return null;
  }
  const currency = group?.currency || user?.preferences?.currency || "USD";

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      // The settlement is from the other person to the current user (i.e., they owe you)
      const payload = {
        circleId,
        to: personId, // the other person is the 'to' (the one who will pay)
        amount: amountNum,
        paymentMethod: method,
        title: `Payment request from ${user?.name}`,
      };
      const created = await createSettlement(payload);
      if (created) {
        toast.success("Payment request sent");
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || "Failed to send payment request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-paper border-2 border-ink p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-display text-xl">Request Payment</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }} className="space-y-4">
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
            <label className="block text-[10px] font-mono uppercase tracking-[0.16em] mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMethod("cash")}
                className={`h-10 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  method === "cash" ? "border-ink bg-card" : "border-rule hover:border-ink"
                }`}
              >
                <Banknote className="h-3 w-3" /> Cash
              </button>
              <button
                onClick={() => setMethod("upi")}
                className={`h-10 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  method === "upi" ? "border-ink bg-card" : "border-rule hover:border-ink"
                }`}
              >
                <Smartphone className="h-3 w-3" /> UPI
              </button>
              <button
                onClick={() => setMethod("bank_transfer")}
                className={`h-10 flex flex-col items-center justify-center gap-1 border-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  method === "bank_transfer" ? "border-ink bg-card" : "border-rule hover:border-ink"
                }`}
              >
                <CreditCard className="h-3 w-3" /> Bank
              </button>
            </div>
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
                <>Sending...</>
              ) : (
                <>
                  <span>Request Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}