import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AvatarDot, Figure, Pill } from "../components/ui/Primitives";
import { getExpense, deleteExpense, uploadReceipt, deleteReceipt } from "../services/expense.service";
import { useFinancialEngine } from "../services/financial.engine";
import { ArrowLeft, Trash2, Upload, Download, FileText, Edit } from "lucide-react";

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const engine = useFinancialEngine();

  useEffect(() => {
    let active = true;
    async function loadExpense() {
      try {
        setLoading(true);
        setError(null);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return;
    }
    try {
      setDeleting(true);
      await deleteExpense(id);
      engine.refreshAfterAction('EXPENSE_DELETED', expense.groupId);
      navigate("/app/ledger");
    } catch (err) {
      setError(err.message || "Failed to delete expense");
      setDeleting(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      await uploadReceipt(id, file);
      const data = await getExpense(id);
      setExpense(data);
    } catch (err) {
      setError(err.message || "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleReceiptDelete = async () => {
    if (!confirm("Are you sure you want to delete this receipt?")) {
      return;
    }
    try {
      await deleteReceipt(id);
      const data = await getExpense(id);
      setExpense(data);
    } catch (err) {
      setError(err.message || "Failed to delete receipt");
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
        <Link to="/app/ledger" className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to ledger
        </Link>
      </div>
    );
  }

  const { participants, paidBy, groupId, groupName, splitMethod, currency, amount } = expense;

  const myShare = participants?.find(
    (p) => p.memberId === engine.currentUserId || p.memberId === engine.currentMemberId
  )?.share || 0;

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-8 pb-10 border-b border-ink">
        <Link
          to="/app/ledger"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to ledger
        </Link>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Pill tone="ink">{expense.category}</Pill>
              <Pill tone="neutral">{currency}</Pill>
              <Pill tone="muted">{splitMethod}</Pill>
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">{expense.description}</h1>
            <p className="mt-5 font-display italic text-xl text-ink-soft max-w-lg">
              {expense.note || "No additional notes"}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <AvatarDot member={paidBy} size={28} />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {paidBy?.name || "A user"} paid · {new Date(expense.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="border border-ink bg-card">
            <div className="px-6 py-5 border-b border-rule">
              <div className="eyebrow mb-2">Amount</div>
              <Figure value={amount} currency={currency} size="xl" tone="ink" />
            </div>
            <div className="px-6 py-5">
              <div className="eyebrow mb-2">Your share</div>
              <Figure
                value={myShare}
                currency={currency}
                size="xl"
                tone="ledger"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex gap-3">
          <Link
            to={`/app/expenses/${id}/edit`}
            className="h-10 px-4 inline-flex items-center gap-2 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            <Edit className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 px-4 inline-flex items-center gap-2 border-2 border-vermilion text-vermilion font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion hover:text-paper transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Content */}
      <section className="px-5 md:px-10 lg:px-14 py-12">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10">
          <div>
            {/* Participants */}
            <div className="mb-10">
              <h3 className="font-display text-2xl mb-4">Split between</h3>
              <ul className="border border-ink bg-card divide-y divide-rule">
                {participants?.map((p) => (
                  <li key={p.memberId} className="px-4 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarDot member={p} size={32} />
                      <div className="min-w-0">
                        <div className="font-display text-base truncate">{p.name || 'A user'}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                          {p.email || ''}
                        </div>
                      </div>
                    </div>
                    <Figure value={p.share} currency={currency} size="sm" />
                  </li>
                ))}
              </ul>
            </div>

            {/* Receipt */}
            <div>
              <h3 className="font-display text-2xl mb-4">Receipt</h3>
              {expense.receipt ? (
                <div className="border border-ink bg-card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-ink-muted" />
                      <div>
                        <div className="font-display text-base">Receipt attached</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                          Click to view
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={expense.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3 inline-flex items-center gap-2 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
                      >
                        <Download className="h-3.5 w-3.5" /> View
                      </a>
                      <button
                        onClick={handleReceiptDelete}
                        className="h-9 px-3 inline-flex items-center gap-2 border border-vermilion text-vermilion font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion hover:text-paper transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-rule p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-ink-muted" />
                  <p className="text-sm text-ink-muted mb-4">No receipt uploaded</p>
                  <label className="h-10 px-4 inline-flex items-center gap-2 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition cursor-pointer">
                    <Upload className="h-3.5 w-3.5" /> Upload receipt
                    <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Details */}
            <div className="border border-ink bg-card p-6">
              <div className="eyebrow mb-4">Details</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-soft">Date</span>
                  <span className="font-mono text-xs">{new Date(expense.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-soft">Category</span>
                  <Pill tone="neutral" className="text-[9px]">{expense.category}</Pill>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-soft">Split method</span>
                  <span className="font-mono text-xs">{splitMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-soft">Circle</span>
                  <Link to={`/app/circles/${groupId}`} className="font-mono text-xs underline">
                    {groupName || 'A circle'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="border border-ink bg-card p-6">
              <div className="eyebrow mb-4">Activity</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Created</span>
                  <span className="font-mono text-xs">{new Date(expense.createdAt).toLocaleString()}</span>
                </div>
                {expense.updatedAt !== expense.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">Last updated</span>
                    <span className="font-mono text-xs">{new Date(expense.updatedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}