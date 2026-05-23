'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readNdjsonLines } from '@/lib/ndjson';
import type { Grouping } from '@/lib/groupings';

type GroupingStreamEvent =
  | { type: 'meta'; month: string; cached: boolean }
  | { type: 'grouping'; data: Grouping }
  | { type: 'done' }
  | { type: 'error'; message: string };

function isGroupingStreamEvent(val: unknown): val is GroupingStreamEvent {
  if (typeof val !== 'object' || val === null) return false;
  const t = (val as { type?: unknown }).type;
  return t === 'meta' || t === 'grouping' || t === 'done' || t === 'error';
}

export interface UseGroupingsResult {
  groupings: Grouping[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  updateGrouping: (groupingId: string, transactionIds: string[]) => Promise<Grouping>;
}

export function useGroupings(month: string | null, enabled: boolean): UseGroupingsResult {
  const [groupings, setGroupings] = useState<Grouping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancels in-flight fetches in two cases: (1) month changes while a request is running,
  // so the stale response can't overwrite newer state; (2) component unmounts mid-fetch,
  // so setState is never called on an unmounted component.
  const abortRef = useRef<AbortController | null>(null);
  // Tracks which month has already been fetched to prevent re-entry on re-renders.
  const fetchedForRef = useRef<string | null>(null);

  const fetchGroupings = useCallback(async (forceRefresh: boolean) => {
    if (!month) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchedForRef.current = month; // optimistic mark — cleared on error to allow retry

    setIsLoading(true);
    setError(null);
    setGroupings([]);

    try {
      const url = `/api/ask-llm/groupings?month=${month}${forceRefresh ? '&refresh=true' : ''}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (!controller.signal.aborted) {
          setError(data.error ?? 'Failed to load groupings');
          fetchedForRef.current = null;
        }
        return;
      }

      if (!response.body) {
        setError('Streaming not supported');
        return;
      }

      const reader = response.body.getReader();
      for await (const raw of readNdjsonLines(reader)) {
        if (!isGroupingStreamEvent(raw)) continue;
        if (raw.type === 'grouping') {
          setGroupings((prev) => [...prev, raw.data]);
        } else if (raw.type === 'error') {
          setError(raw.message);
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setError('Failed to load groupings');
      fetchedForRef.current = null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [month]);

  // Reset when the month changes so a new fetch fires on the next enabled=true.
  useEffect(() => {
    setGroupings([]);
    setError(null);
    fetchedForRef.current = null;
  }, [month]);

  // Lazy: fire once when the Groups tab first opens for the current month.
  useEffect(() => {
    if (enabled && month && fetchedForRef.current !== month) {
      fetchGroupings(false);
    }
  }, [enabled, month, fetchGroupings]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const refresh = useCallback(() => fetchGroupings(true), [fetchGroupings]);

  const updateGrouping = useCallback(async (groupingId: string, transactionIds: string[]): Promise<Grouping> => {
    if (!month) throw new Error('No month set');
    const response = await fetch('/api/ask-llm/groupings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, groupingId, transactionIds }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? 'Failed to save grouping');
    const updated: Grouping = data.grouping;
    setGroupings((prev) => prev.map((g) => (g.id === groupingId ? updated : g)));
    return updated;
  }, [month]);

  return { groupings, isLoading, error, refresh, updateGrouping };
}
