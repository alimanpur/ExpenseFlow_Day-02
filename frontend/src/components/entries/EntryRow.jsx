import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../services/currency.service';
import { Eye, Edit, Archive, Trash2, Copy, Download, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * EntryRow Component
 * Displays a single expense entry in the table
 */
export default function EntryRow({
  entry,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onArchive,
  onDelete,
  onDuplicate,
  onDownloadReceipt,
  showCircle = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const paidByName = entry.paidBy?.name || 'Unknown';
  const participantNames = entry.participants?.map(p => p.name).join(', ') || 'No participants';
  const hasReceipt = entry.receipts?.length > 0 || entry.receipt;
  const isArchived = entry.isDeleted;

  // Build settlement summary per participant
  // The payer is owed by each participant their individual share
  const participantSettlements = useMemo(() => {
    if (!entry.participants) return [];
    return entry.participants
      .filter(p => p.memberId !== entry.paidBy?.id)
      .map(p => ({
        name: p.name || 'Someone',
        share: p.share || 0,
        currency: entry.currency || 'USD',
        owesTo: paidByName,
      }));
  }, [entry.participants, entry.paidBy, paidByName, entry.currency]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'settled':
        return 'text-ledger';
      case 'pending':
        return 'text-amber-600';
      case 'partially_settled':
        return 'text-orange-600';
      case 'cancelled':
        return 'text-ink-muted';
      default:
        return 'text-ink';
    }
  };

  const getStatusDescription = () => {
    if (entry.status === 'settled') return 'Settled';
    if (entry.status === 'cancelled') return 'Cancelled';
    if (entry.status === 'partially_settled') return 'Partially settled';
    
    // For pending, describe who owes whom
    if (participantSettlements.length === 0) return 'Pending';
    
    const descriptions = participantSettlements.slice(0, 2).map(ps =>
      `${ps.name} owes ${formatCurrency(ps.share, ps.currency, { useLargeNumberFormat: true })}`
    );
    
    const remainder = participantSettlements.length - 2;
    if (remainder > 0) descriptions.push(`+${remainder} more`);
    
    return descriptions.join(', ');
  };

  return (
    <>
      <tr className="border-b border-rule hover:bg-paper-deep transition-colors">
        {/* Checkbox */}
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="w-4 h-4 border-rule accent-vermilion"
          />
        </td>

        {/* Expand/Collapse Button */}
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>

        {/* Date */}
        <td className="px-4 py-3">
          <div className="font-mono text-xs text-ink-muted">
            {formatDate(entry.date || entry.createdAt)}
          </div>
        </td>

        {/* Title & Category */}
        <td className="px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-sm truncate">{entry.description}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mt-0.5">
              {entry.category}
            </div>
          </div>
        </td>

        {/* Circle */}
        {showCircle && (
          <td className="px-4 py-3">
            <div className="font-mono text-xs truncate max-w-[150px]" title={entry.groupName}>
              {entry.groupName}
            </div>
          </td>
        )}

        {/* Paid By */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {entry.paidBy?.avatar && (
              <img
                src={entry.paidBy.avatar}
                alt={paidByName}
                className="h-6 w-6 rounded-full border border-rule"
              />
            )}
            <span className="text-sm truncate max-w-[120px]" title={paidByName}>
              {paidByName}
            </span>
          </div>
        </td>

        {/* Participants */}
        <td className="px-4 py-3">
          <div className="text-xs text-ink-muted truncate max-w-[200px]" title={participantNames}>
            {entry.participants?.length || 0} participants
          </div>
        </td>

        {/* Amount */}
        <td className="px-4 py-3 text-right">
          <div className="font-mono text-sm font-medium">
            {formatCurrency(entry.amount, entry.currency, { useLargeNumberFormat: true })}
          </div>
        </td>

        {/* Split Method */}
        <td className="px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            {entry.splitMethod}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 max-w-[200px]">
          <div className="flex flex-col">
            <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${getStatusColor(entry.status)}`}>
              {entry.status || 'pending'}
            </span>
            {entry.status === 'pending' && participantSettlements.length > 0 && (
              <span className="font-mono text-[9px] text-ink-muted tracking-[0.10em] mt-0.5 truncate" title={getStatusDescription()}>
                {getStatusDescription()}
              </span>
            )}
          </div>
        </td>

        {/* Receipt */}
        <td className="px-4 py-3 text-center">
          {hasReceipt ? (
            <span className="text-ink">📎</span>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1 hover:bg-paper-deep transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-ink-muted" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-paper border-2 border-ink shadow-lg z-50 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {hasReceipt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadReceipt();
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Receipt
                    </button>
                  )}
                  <div className="border-t border-rule my-1" />
                  {!isArchived ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive();
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2 text-amber-600"
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive();
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2 text-ledger"
                    >
                      <Archive className="h-3.5 w-3.5" /> Restore
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper-deep flex items-center gap-2 text-vermilion"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="border-b border-rule bg-paper-deep">
          <td colSpan={showCircle ? 12 : 11} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-3">
                  Expense Information
                </h4>
                <div className="space-y-2 text-sm">
                  {entry.notes && (
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Notes:</span>
                      <p className="mt-1 text-ink-soft">{entry.notes}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Split Method:</span>
                    <span className="ml-2 text-ink">{entry.splitMethod}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Created:</span>
                    <span className="ml-2 text-ink">{formatDate(entry.createdAt)}</span>
                  </div>
                  {entry.updatedAt !== entry.createdAt && (
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Updated:</span>
                      <span className="ml-2 text-ink">{formatDate(entry.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Participants */}
              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-3">
                  Participants ({entry.participants?.length || 0})
                </h4>
                <div className="space-y-2">
                  {entry.participants?.map((participant, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {participant.avatar && (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="h-5 w-5 rounded-full border border-rule"
                          />
                        )}
                        <span>{participant.name}</span>
                        {participant.isGuest && (
                          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-ink-muted">Guest</span>
                        )}
                      </div>
                      <span className="font-mono text-xs">
                        {formatCurrency(participant.share, entry.currency, { useLargeNumberFormat: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}