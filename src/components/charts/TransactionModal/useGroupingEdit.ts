'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Grouping } from '@/lib/groupings';

interface UseGroupingEditOptions {
  month: string | null;
  groupings: Grouping[];
  updateGrouping: (groupingId: string, transactionIds: string[]) => Promise<Grouping>;
  onSaved: (newGroupingId: string) => void;
}

export interface UseGroupingEditResult {
  editingGroupingId: string | null;
  editingTxIds: Set<string>;
  isSaving: boolean;
  editError: string | null;
  startEdit: (id: string) => void;
  cancelEdit: () => void;
  toggleEditingTxId: (id: string) => void;
  saveEdit: () => Promise<void>;
}

export function useGroupingEdit({
  month,
  groupings,
  updateGrouping,
  onSaved,
}: UseGroupingEditOptions): UseGroupingEditResult {
  const [editingGroupingId, setEditingGroupingId] = useState<string | null>(null);
  const [editingTxIds, setEditingTxIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditingGroupingId(null);
    setEditingTxIds(new Set());
    setEditError(null);
  }, [month]);

  const startEdit = useCallback((id: string) => {
    const grouping = groupings.find((g) => g.id === id);
    if (!grouping) return;
    setEditingGroupingId(id);
    setEditingTxIds(new Set(grouping.transactionIds));
    setEditError(null);
  }, [groupings]);

  const cancelEdit = useCallback(() => {
    setEditingGroupingId(null);
    setEditingTxIds(new Set());
    setEditError(null);
  }, []);

  const toggleEditingTxId = useCallback((id: string) => {
    setEditingTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingGroupingId) return;
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateGrouping(editingGroupingId, [...editingTxIds]);
      onSaved(updated.id);
      setEditingGroupingId(null);
      setEditingTxIds(new Set());
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editingGroupingId, editingTxIds, updateGrouping, onSaved]);

  return { editingGroupingId, editingTxIds, isSaving, editError, startEdit, cancelEdit, toggleEditingTxId, saveEdit };
}
