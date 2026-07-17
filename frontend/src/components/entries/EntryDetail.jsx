import { formatCurrency, formatDate } from '../../services/currency.service';

/**
 * EntryDetail Component
 * Displays detailed expense information in expanded view
 */
export default function EntryDetail({ entry, onClose }) {
  if (!entry) return null;

  const totalShares = entry.participants?.reduce((sum, p) => sum + (p.share || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
      <div className="bg-paper border-2 border-ink max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-paper border-b border-rule p-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl mb-2">{entry.description}</h2>
            <div className="flex items-center gap-4 text-sm text-ink-muted">
              <span className="font-mono text-xs uppercase tracking-wider">{entry.category}</span>
              <span>•</span>
              <span>{entry.groupName}</span>
              <span>•</span>
              <span>{formatDate(entry.date || entry.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-paper-deep transition-colors"
          >
            <span className="font-mono text-xs uppercase tracking-wider">Close</span>
          </button>
        </div>

        <div className="p-6">
          {/* Financial Breakdown */}
          <div className="border border-rule bg-paper-deep p-6 mb-6">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-4">
              Financial Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">
                  Total Amount
                </div>
                <div className="font-display text-2xl">
                  {formatCurrency(entry.amount, entry.currency, { useLargeNumberFormat: true })}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">
                  Paid By
                </div>
                <div className="font-display text-lg">
                  {entry.paidBy?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">
                  Split Method
                </div>
                <div className="font-mono text-sm uppercase tracking-wider">
                  {entry.splitMethod}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted mb-1">
                  Status
                </div>
                <div className="font-mono text-sm uppercase tracking-wider">
                  {entry.status || 'pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Participants & Shares */}
          <div className="border border-rule bg-paper-deep p-6 mb-6">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-4">
              Participants & Individual Shares
            </h3>
            <div className="space-y-3">
              {entry.participants?.map((participant, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-rule bg-paper"
                >
                  <div className="flex items-center gap-3">
                    {participant.avatar && (
                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className="h-8 w-8 rounded-full border border-rule"
                      />
                    )}
                    <div>
                      <div className="font-display text-sm">
                        {participant.name}
                      </div>
                      {participant.isGuest && (
                        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-ink-muted">
                          Guest
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {formatCurrency(participant.share, entry.currency, { useLargeNumberFormat: true })}
                    </div>
                    {participant.percentage && (
                      <div className="text-[10px] text-ink-muted">
                        {participant.percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-rule flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Total
              </span>
              <span className="font-mono text-sm font-medium">
                {formatCurrency(totalShares, entry.currency, { useLargeNumberFormat: true })}
              </span>
            </div>
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="border border-rule bg-paper-deep p-6 mb-6">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-3">
                Notes
              </h3>
              <p className="text-sm text-ink-soft whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* Receipts */}
          {entry.receipts && entry.receipts.length > 0 && (
            <div className="border border-rule bg-paper-deep p-6 mb-6">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-3">
                Receipts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {entry.receipts.map((receipt, idx) => (
                  <div
                    key={idx}
                    className="border border-rule bg-paper p-2 hover:border-ink transition-colors cursor-pointer"
                  >
                    {receipt.mimetype?.startsWith('image/') ? (
                      <img
                        src={receipt.url}
                        alt={receipt.filename}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-paper-deep">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                    <div className="mt-2 text-[10px] font-mono text-ink-muted truncate">
                      {receipt.filename}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border border-rule bg-paper-deep p-6">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-3">
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Created:
                </span>
                <span className="ml-2">{formatDate(entry.createdAt)}</span>
              </div>
              {entry.updatedAt !== entry.createdAt && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Updated:
                  </span>
                  <span className="ml-2">{formatDate(entry.updatedAt)}</span>
                </div>
              )}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Currency:
                </span>
                <span className="ml-2">{entry.currency}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Split Method:
                </span>
                <span className="ml-2">{entry.splitMethod}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}