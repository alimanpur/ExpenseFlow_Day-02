import { useState, useMemo } from 'react';

/**
 * EntriesFilters Component
 * Advanced filtering panel for entries
 */
export default function EntriesFilters({
  filters,
  onFilterChange,
  circles = [],
  categories = [],
  users = [],
  isLoading = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleClear = () => {
    onFilterChange({
      page: 1,
      limit: filters.limit || 20,
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.circleId ||
      filters.category ||
      filters.paidBy ||
      filters.participant ||
      filters.startDate ||
      filters.endDate ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.splitMethod ||
      filters.status ||
      filters.isArchived !== undefined ||
      filters.hasReceipt !== undefined ||
      filters.currency
    );
  }, [filters]);

  if (isLoading) {
    return (
      <div className="border border-rule bg-paper p-4 mb-6">
        <div className="h-10 bg-paper-deep animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-paper-deep animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-paper mb-6">
      {/* Main filters row - always visible */}
      <div className="p-4 border-b border-rule">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-vermilion hover:text-ink transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
          >
            {isExpanded ? 'Hide' : 'Show'} advanced
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search expenses..."
              className="w-full px-3 py-2 border border-rule bg-paper-deep text-ink text-sm focus:border-ink focus:outline-none transition-colors"
            />
          </div>

          {/* Circle */}
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
              Circle
            </label>
            <select
              value={filters.circleId || ''}
              onChange={(e) => handleChange('circleId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-rule bg-paper-deep text-ink text-sm focus:border-ink focus:outline-none transition-colors"
            >
              <option value="">All circles</option>
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleChange('category', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-rule bg-paper-deep text-ink text-sm focus:border-ink focus:outline-none transition-colors"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-rule bg-paper-deep text-ink text-sm focus:border-ink focus:outline-none transition-colors"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="settled">Settled</option>
              <option value="partially_settled">Partially Settled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced filters - collapsible */}
      {isExpanded && (
        <div className="p-4 border-b border-rule bg-paper-deep">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Paid By */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Paid By
              </label>
              <select
                value={filters.paidBy || ''}
                onChange={(e) => handleChange('paidBy', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Participant */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Participant
              </label>
              <select
                value={filters.participant || ''}
                onChange={(e) => handleChange('participant', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="">All participants</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Method */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Split Method
              </label>
              <select
                value={filters.splitMethod || ''}
                onChange={(e) => handleChange('splitMethod', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="">All methods</option>
                <option value="equal">Equal</option>
                <option value="exact">Exact</option>
                <option value="percentage">Percentage</option>
                <option value="shares">Shares</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Currency
              </label>
              <input
                type="text"
                value={filters.currency || ''}
                onChange={(e) => handleChange('currency', e.target.value.toUpperCase() || undefined)}
                placeholder="USD"
                maxLength={3}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Min Amount */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Min Amount
              </label>
              <input
                type="number"
                value={filters.minAmount || ''}
                onChange={(e) => handleChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Max Amount
              </label>
              <input
                type="number"
                value={filters.maxAmount || ''}
                onChange={(e) => handleChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Additional filters row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {/* Archived */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Archived
              </label>
              <select
                value={filters.isArchived === undefined ? '' : filters.isArchived.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange('isArchived', val === '' ? undefined : val === 'true');
                }}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="">Active only</option>
                <option value="false">Active</option>
                <option value="true">Archived</option>
              </select>
            </div>

            {/* Has Receipt */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Receipt
              </label>
              <select
                value={filters.hasReceipt === undefined ? '' : filters.hasReceipt.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange('hasReceipt', val === '' ? undefined : val === 'true');
                }}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="">All</option>
                <option value="true">With receipt</option>
                <option value="false">Without receipt</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'date'}
                onChange={(e) => handleChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="title">Title</option>
                <option value="createdAt">Created</option>
                <option value="updatedAt">Updated</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mb-1">
                Order
              </label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => handleChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-rule bg-paper text-ink text-sm focus:border-ink focus:outline-none transition-colors"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}