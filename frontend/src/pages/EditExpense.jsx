import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getExpense, updateExpense } from "../services/expense.service";
import { useFinancialEngine } from "../services/financial.engine";
import { ArrowLeft, Check } from "lucide-react";

export default function EditExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const engine = useFinancialEngine();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadExpense() {
      try {
        setLoading(true);
        const data = await getExpense(id);
        if (active) {
          setExpense(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load expense");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    if (id) loadExpense();
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expense) return;
    try {
      setSaving(true);
      setError(null);
      await updateExpense(id, {
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        note: expense.note,
      });
      engine.refreshAfterAction('EXPENSE_EDITED', expense.groupId || expense.circleId);
      navigate(`/app/expenses/${id}`);
    } catch (err) {
      setError(err.message || "Failed to update expense");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading expense&hellip;
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-12 text-center">
        <h2 className="font-display text-3xl">Expense not found.</h2>
        {error && <p className="mt-4 text-ink-muted font-mono text-sm">{error}</p>}
        <button onClick={() => navigate("/app/ledger")} className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
          Back to ledger
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-88px)] px-5 md:px-10 lg:px-14 pt-10 pb-20">
      <button
        onClick={() => navigate(`/app/expenses/${id}`)}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to expense
      </button>

      <h1 className="font-display text-5xl md:text-7xl leading-[0.92] mb-12">
        Edit <em className="italic">expense.</em>
      </h1>

      {error && (
        <div className="border-2 border-vermilion bg-vermilion/5 p-6 mb-8">
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
        <div>
          <label className="eyebrow block mb-3">Description</label>
          <input
            type="text"
            value={expense.description}
            onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            className="w-full bg-paper border-b-2 border-ink py-3 font-display text-2xl placeholder:text-ink-muted/50 focus:outline-none"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="eyebrow block mb-3">Amount</label>
            <input
              type="number"
              step="0.01"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: parseFloat(e.target.value) || 0 })}
              className="w-full bg-paper border-2 border-ink p-3 font-display text-lg focus:outline-none focus:border-vermilion"
              required
            />
          </div>

          <div>
            <label className="eyebrow block mb-3">Category</label>
            <select
              value={expense.category}
              onChange={(e) => setExpense({ ...expense, category: e.target.value })}
              className="w-full h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
            >
              <option value="Food & drink">Food & drink</option>
              <option value="Lodging">Lodging</option>
              <option value="Transport">Transport</option>
              <option value="Groceries">Groceries</option>
              <option value="Utilities">Utilities</option>
              <option value="Rent">Rent</option>
              <option value="Gifts">Gifts</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-3">Date</label>
          <input
            type="date"
            value={expense.date}
            onChange={(e) => setExpense({ ...expense, date: e.target.value })}
            className="w-full h-10 px-3 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
            required
          />
        </div>

        <div>
          <label className="eyebrow block mb-3">Note (optional)</label>
          <textarea
            value={expense.note || ""}
            onChange={(e) => setExpense({ ...expense, note: e.target.value })}
            rows={3}
            className="w-full bg-paper border-2 border-ink p-4 font-display text-sm focus:outline-none focus:border-vermilion resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="h-12 px-6 inline-flex items-center gap-3 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink transition disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/app/expenses/${id}`)}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}