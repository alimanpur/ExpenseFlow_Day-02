import { useMemo } from 'react';
import EntryRow from './EntryRow';

/**
 * EntriesTable Component
 * Displays entries in a table format with sorting and selection
 */
export default function EntriesTable({
  entries,
  selectedIds,
  onSelectionChange,
  onView,
  onEdit,
  onArchive,
  onDelete,
  onDuplicate,
  onDownloadReceipt,
  showCircle = true,
  isLoading = false,
}) {
  const allSelected = useMemo(() => {
    return entries.length > 0 && selectedIds.size === entries.length;
  }, [entries, selectedIds]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(entries.map(e => e.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="border border-rule bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-rule bg-paper-deep">
              <tr>
                <th className="px-4 py-3 text-left">
                  <div className="h-4 w-4 bg-paper animate-pulse" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3 w-8 bg-paper animate-pulse" />
                </th>
                {[...Array(9)].map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <div className="h-3 w-16 bg-paper animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-rule">
                  {[...Array(11)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-paper-deep animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border border-rule bg-paper p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="font-display text-xl mb-2">No expenses found</h3>
        <p className="text-ink-muted text-sm">
          Try adjusting your filters or create a new expense
        </p>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-paper">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-rule bg-paper-deep">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 border-rule accent-vermilion"
                />
              </th>
              <th className="px-4 py-3 text-left w-8" />
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Date
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Title / Category
                </span>
              </th>
              {showCircle && (
                <th className="px-4 py-3 text-left">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Circle
                  </span>
                </th>
              )}
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Paid By
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Participants
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Amount
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Split
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Status
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Receipt
                </span>
              </th>
              <th className="px-4 py-3 text-left w-12" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isSelected={selectedIds.has(entry.id)}
                onSelect={(checked) => {
                  const newSelection = new Set(selectedIds);
                  if (checked) {
                    newSelection.add(entry.id);
                  } else {
                    newSelection.delete(entry.id);
                  }
                  onSelectionChange(newSelection);
                }}
                onView={() => onView(entry)}
                onEdit={() => onEdit(entry)}
                onArchive={() => onArchive(entry)}
                onDelete={() => onDelete(entry)}
                onDuplicate={() => onDuplicate(entry)}
                onDownloadReceipt={() => onDownloadReceipt(entry)}
                showCircle={showCircle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}