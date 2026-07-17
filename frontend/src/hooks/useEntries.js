import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEntries,
  getEntry,
  getEntryStatistics,
  searchEntries,
  getEntryTimeline,
  bulkDeleteEntries,
  bulkArchiveEntries,
  bulkRestoreEntries,
  bulkUpdateCategory,
  bulkMoveToCircle,
  exportEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  uploadReceipt,
  deleteReceipt,
} from '../services/entries.service';

/**
 * Main hook for fetching entries with filters
 */
export function useEntries(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['entries', filters],
    queryFn: () => getEntries(filters),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Hook for fetching single entry
 */
export function useEntry(entryId, options = {}) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => getEntry(entryId),
    enabled: !!entryId && options.enabled !== false,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook for fetching entry statistics
 */
export function useEntryStatistics(options = {}) {
  return useQuery({
    queryKey: ['entryStatistics'],
    queryFn: getEntryStatistics,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
}

/**
 * Hook for searching entries
 */
export function useEntrySearch(query, limit = 20, options = {}) {
  return useQuery({
    queryKey: ['entrySearch', query, limit],
    queryFn: () => searchEntries(query, limit),
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook for fetching entry timeline
 */
export function useEntryTimeline(entryId, options = {}) {
  return useQuery({
    queryKey: ['entryTimeline', entryId],
    queryFn: () => getEntryTimeline(entryId),
    enabled: !!entryId && options.enabled !== false,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook for all entry mutations
 */
export function useEntryMutations() {
  const queryClient = useQueryClient();

  const invalidateEntries = () => {
    queryClient.invalidateQueries({ queryKey: ['entries'] });
    queryClient.invalidateQueries({ queryKey: ['entry'] });
    queryClient.invalidateQueries({ queryKey: ['entryStatistics'] });
    queryClient.invalidateQueries({ queryKey: ['entrySearch'] });
  };

  const createMutation = useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }) => updateEntry(entryId, data),
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({ entryId, file }) => uploadReceipt(entryId, file),
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  return {
    createEntry: createMutation.mutate,
    updateEntry: updateMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    uploadReceipt: uploadReceiptMutation.mutate,
    deleteReceipt: deleteReceiptMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploadingReceipt: uploadReceiptMutation.isPending,
    isDeletingReceipt: deleteReceiptMutation.isPending,
  };
}

/**
 * Hook for bulk operations
 */
export function useBulkOperations() {
  const queryClient = useQueryClient();

  const invalidateEntries = () => {
    queryClient.invalidateQueries({ queryKey: ['entries'] });
    queryClient.invalidateQueries({ queryKey: ['entry'] });
    queryClient.invalidateQueries({ queryKey: ['entryStatistics'] });
  };

  const deleteMutation = useMutation({
    mutationFn: bulkDeleteEntries,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: bulkArchiveEntries,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: bulkRestoreEntries,
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ entryIds, category }) => bulkUpdateCategory(entryIds, category),
    onSuccess: () => {
      invalidateEntries();
    },
  });

  const moveToCircleMutation = useMutation({
    mutationFn: ({ entryIds, targetCircleId }) => bulkMoveToCircle(entryIds, targetCircleId),
    onSuccess: () => {
      invalidateEntries();
    },
  });

  return {
    bulkDelete: deleteMutation.mutate,
    bulkArchive: archiveMutation.mutate,
    bulkRestore: restoreMutation.mutate,
    bulkUpdateCategory: updateCategoryMutation.mutate,
    bulkMoveToCircle: moveToCircleMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isMoving: moveToCircleMutation.isPending,
  };
}

/**
 * Hook for export functionality
 */
export function useEntryExport() {
  const exportMutation = useMutation({
    mutationFn: ({ format, filters }) => exportEntries(format, filters),
  });

  return {
    exportEntries: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    exportData: exportMutation.data,
  };
}