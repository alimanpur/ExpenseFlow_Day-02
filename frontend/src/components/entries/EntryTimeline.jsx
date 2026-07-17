import { formatDate } from '../../services/currency.service';

/**
 * EntryTimeline Component
 * Displays activity timeline for an expense
 */
export default function EntryTimeline({ timeline = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="border border-rule bg-paper p-6">
        <div className="h-6 bg-paper-deep animate-pulse w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-4 bg-paper-deep animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-paper-deep animate-pulse w-3/4" />
                <div className="h-2 bg-paper-deep animate-pulse w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="border border-rule bg-paper p-6 text-center">
        <div className="text-2xl mb-2">📋</div>
        <p className="text-ink-muted text-sm">No activity recorded</p>
      </div>
    );
  }

  const getActionIcon = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('created')) return '✨';
    if (actionLower.includes('updated') || actionLower.includes('edited')) return '✏️';
    if (actionLower.includes('deleted')) return '🗑️';
    if (actionLower.includes('restored')) return '♻️';
    if (actionLower.includes('receipt')) return '📎';
    if (actionLower.includes('settlement')) return '💰';
    if (actionLower.includes('archived')) return '📦';
    return '📌';
  };

  const getActionColor = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('deleted')) return 'text-vermilion';
    if (actionLower.includes('restored') || actionLower.includes('created')) return 'text-ledger';
    if (actionLower.includes('updated')) return 'text-amber-600';
    return 'text-ink';
  };

  return (
    <div className="border border-rule bg-paper p-6">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-4">
        Activity Timeline
      </h3>
      <div className="space-y-4">
        {timeline.map((event, index) => (
          <div key={index} className="flex gap-4">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className={`text-lg ${getActionColor(event.action)}`}>
                {getActionIcon(event.action)}
              </div>
              {index < timeline.length - 1 && (
                <div className="w-px h-8 bg-rule mt-1" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink leading-relaxed">
                    {event.description || event.action}
                  </p>
                  {event.changes && Object.keys(event.changes).length > 0 && (
                    <div className="mt-1 text-xs text-ink-muted">
                      {Object.entries(event.changes).map(([key, value]) => (
                        <div key={key} className="font-mono">
                          {key}: {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="font-mono text-[9px] text-ink-muted whitespace-nowrap">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}