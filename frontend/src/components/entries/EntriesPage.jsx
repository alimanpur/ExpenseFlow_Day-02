import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import EntriesSummary from './EntriesSummary';
import EntriesFilters from './EntriesFilters';
import EntriesTable from './EntriesTable';
import BulkActions from './BulkActions';
import EntryDetail from './EntryDetail';
import ReceiptPreview from './ReceiptPreview';
import EntryTimeline from './EntryTimeline';
import {
  useEntries,
  useEntryStatistics,
  useEntryMutations,
  useBulkOperations,
  useEntryExport,
} from '../../hooks/useEntries';
import { socketService } from '../../services/socket.service';
import { useAuth } from '../../hooks/useAuth';

/**
 * EntriesPage Component
 * Main page for Entries Management Center
 */
export default function EntriesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.preferences?.currency || 'USD';

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);

  // Fetch data
  const { data: entriesData, isLoading: entriesLoading } = useEntries(filters);
  const { data: statistics, isLoading: statsLoading } = useEntryStatistics();

  const { createEntry, deleteEntry, updateEntry, uploadReceipt, deleteReceipt } = useEntryMutations();
  const { bulkDelete, bulkArchive, bulkRestore, bulkUpdateCategory, bulkMoveToCircle } = useBulkOperations();
  const { exportEntries } = useEntryExport();

  // Extract entries and pagination
  const entries = useMemo(() => entriesData?.entries || [], [entriesData]);
  const pagination = useMemo(() => entriesData?.pagination || {}, [entriesData]);

  // Get filter options from entries
  const circles = useMemo(() => {
    const uniqueCircles = new Map();
    entries.forEach(entry => {
      if (entry.groupId && entry.groupName) {
        uniqueCircles.set(entry.groupId, { id: entry.groupId, name: entry.groupName });
      }
    });
    return Array.from(uniqueCircles.values());
  }, [entries]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set();
    entries.forEach(entry => {
      if (entry.category) uniqueCategories.add(entry.category);
    });
    return Array.from(uniqueCategories).map(name => ({ name }));
  }, [entries]);

  const users = useMemo(() => {
    const uniqueUsers = new Map();
    entries.forEach(entry => {
      if (entry.paidBy?.id && entry.paidBy?.name) {
        uniqueUsers.set(entry.paidBy.id, { id: entry.paidBy.id, name: entry.paidBy.name });
      }
      entry.participants?.forEach(p => {
        if (p.memberId && p.name) {
          uniqueUsers.set(p.memberId, { id: p.memberId, name: p.name });
        }
      });
    });
    return Array.from(uniqueUsers.values());
  }, [entries]);

  // Socket synchronization
  useEffect(() => {
    const unsubCreated = socketService.on('expense:created', () => {
      window.location.reload();
    });
    const unsubUpdated = socketService.on('expense:updated', () => {
      window.location.reload();
    });
    const unsubDeleted = socketService.on('expense:deleted', () => {
      window.location.reload();
    });
    const unsubRestored = socketService.on('expense:restored', () => {
      window.location.reload();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubRestored();
    };
  }, []);

  // Handlers
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setSelectedIds(new Set());
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
  };

  const handleEditEntry = (entry) => {
    navigate(`/app/expenses/${entry.id}/edit`);
  };

  const handleArchiveEntry = async (entry) => {
    if (entry.isDeleted) {
      await bulkRestore([entry.id]);
    } else {
      await bulkArchive([entry.id]);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (window.confirm(`Are you sure you want to delete "${entry.description}"?`)) {
      await deleteEntry(entry.id);
    }
  };

  const handleDuplicateEntry = async (entry) => {
    await createEntry({
      ...entry,
      title: `${entry.description} (Copy)`,
      date: new Date().toISOString(),
    });
  };

  const handleDownloadReceipt = (entry) => {
    if (entry.receipts?.[0] || entry.receipt) {
      setShowReceipt(entry.receipts?.[0] || entry.receipt);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} entries?`)) {
      await bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkArchive = async () => {
    await bulkArchive(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkRestore = async () => {
    await bulkRestore(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkMove = async (targetCircleId) => {
    await bulkMoveToCircle({ entryIds: Array.from(selectedIds), targetCircleId });
    setSelectedIds(new Set());
  };

  const handleBulkCategory = async (category) => {
    await bulkUpdateCategory({ entryIds: Array.from(selectedIds), category });
    setSelectedIds(new Set());
  };

  const handleExport = async (format) => {
    await exportEntries({ format, filters });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-paper">
      <PageHeader
        folio="V"
        title="Entries"
        description="Manage all your expenses across circles"
        actions={
          <button
            onClick={() => navigate('/app/expenses/new')}
            className="h-10 px-4 inline-flex items-center gap-2 bg-vermilion text-paper text-xs font-mono uppercase tracking-[0.16em] hover:bg-ink transition-colors"
          >
            <Plus className="h-4 w-4" /> New Entry
          </button>
        }
      />

      <div className="px-5 md:px-10 lg:px-14 pb-14">
        {/* Summary Dashboard */}
        <EntriesSummary statistics={statistics} isLoading={statsLoading} userCurrency={userCurrency} />

        {/* Filters */}
        <EntriesFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          circles={circles}
          categories={categories}
          users={users}
          isLoading={entriesLoading}
        />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
            onBulkRestore={handleBulkRestore}
            onBulkMove={handleBulkMove}
            onBulkCategory={handleBulkCategory}
            onExport={handleExport}
            circles={circles}
            categories={categories}
          />
        )}

        {/* Entries Table */}
        <EntriesTable
          entries={entries}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onView={handleViewEntry}
          onEdit={handleEditEntry}
          onArchive={handleArchiveEntry}
          onDelete={handleDeleteEntry}
          onDuplicate={handleDuplicateEntry}
          onDownloadReceipt={handleDownloadReceipt}
          isLoading={entriesLoading}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="font-mono text-xs text-ink-muted">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border-2 border-ink hover:bg-paper-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs uppercase tracking-wider"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border-2 border-ink hover:bg-paper-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs uppercase tracking-wider"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceipt && (
        <ReceiptPreview
          receipt={showReceipt}
          onClose={() => setShowReceipt(null)}
          onDelete={() => {
            setShowReceipt(null);
          }}
          isOCRReady={false}
        />
      )}
    </div>
  );
}