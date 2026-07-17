import { useState } from 'react';
import { Trash2, Archive, RotateCcw, FolderInput, Tag, Download, X } from 'lucide-react';

/**
 * BulkActions Component
 * Toolbar for bulk operations on selected entries
 */
export default function BulkActions({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkArchive,
  onBulkRestore,
  onBulkMove,
  onBulkCategory,
  onExport,
  circles = [],
  categories = [],
  isDeleting = false,
  isArchiving = false,
  isRestoring = false,
  isMoving = false,
  isUpdatingCategory = false,
}) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleMove = () => {
    if (selectedCircle) {
      onBulkMove(selectedCircle);
      setShowMoveModal(false);
      setSelectedCircle('');
    }
  };

  const handleCategoryUpdate = () => {
    if (selectedCategory) {
      onBulkCategory(selectedCategory);
      setShowCategoryModal(false);
      setSelectedCategory('');
    }
  };

  return (
    <>
      <div className="border-2 border-vermilion bg-paper p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
            {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
          </span>

          <div className="h-6 w-px bg-rule" />

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBulkDelete}
              disabled={isDeleting}
              className="px-3 py-2 border-2 border-ink hover:bg-vermilion hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </span>
            </button>

            <button
              onClick={onBulkArchive}
              disabled={isArchiving}
              className="px-3 py-2 border-2 border-ink hover:bg-amber-600 hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {isArchiving ? 'Archiving...' : 'Archive'}
              </span>
            </button>

            <button
              onClick={onBulkRestore}
              disabled={isRestoring}
              className="px-3 py-2 border-2 border-ink hover:bg-ledger hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {isRestoring ? 'Restoring...' : 'Restore'}
              </span>
            </button>

            <button
              onClick={() => setShowMoveModal(true)}
              disabled={isMoving}
              className="px-3 py-2 border-2 border-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FolderInput className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {isMoving ? 'Moving...' : 'Move'}
              </span>
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              disabled={isUpdatingCategory}
              className="px-3 py-2 border-2 border-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Tag className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {isUpdatingCategory ? 'Updating...' : 'Category'}
              </span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 border-2 border-ink hover:bg-ink hover:text-paper transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Export</span>
            </button>
          </div>

          <div className="ml-auto">
            <button
              onClick={onClearSelection}
              className="p-2 hover:bg-paper-deep transition-colors"
              title="Clear selection"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Move to Circle Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-paper border-2 border-ink p-6 max-w-md w-full">
            <h3 className="font-display text-xl mb-4">Move to Circle</h3>
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Select Target Circle
              </label>
              <select
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
                className="w-full px-3 py-2 border-2 border-ink bg-paper text-ink focus:outline-none"
              >
                <option value="">Select a circle...</option>
                {circles.map((circle) => (
                  <option key={circle.id} value={circle.id}>
                    {circle.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedCircle('');
                }}
                className="px-4 py-2 border-2 border-ink hover:bg-paper-deep transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={!selectedCircle || isMoving}
                className="px-4 py-2 bg-vermilion text-paper hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMoving ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-paper border-2 border-ink p-6 max-w-md w-full">
            <h3 className="font-display text-xl mb-4">Update Category</h3>
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Select Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border-2 border-ink bg-paper text-ink focus:outline-none"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedCategory('');
                }}
                className="px-4 py-2 border-2 border-ink hover:bg-paper-deep transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCategoryUpdate}
                disabled={!selectedCategory || isUpdatingCategory}
                className="px-4 py-2 bg-vermilion text-paper hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingCategory ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-paper border-2 border-ink p-6 max-w-md w-full">
            <h3 className="font-display text-xl mb-4">Export Entries</h3>
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Select Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['csv', 'excel', 'json', 'pdf'].map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      onExport(format);
                      setShowExportModal(false);
                    }}
                    className="px-4 py-3 border-2 border-ink hover:bg-ink hover:text-paper transition-colors font-mono text-xs uppercase tracking-wider"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border-2 border-ink hover:bg-paper-deep transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}