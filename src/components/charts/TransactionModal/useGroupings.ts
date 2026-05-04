'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Grouping } from './types';

export interface UseGroupingsResult {
  groupings: Grouping[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
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
    if (forceRefresh) setGroupings([]);

    try {
      const url = `/api/ask-claude/groupings?month=${month}${forceRefresh ? '&refresh=true' : ''}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (!controller.signal.aborted) {
          setError(data.error ?? 'Failed to load groupings');
          fetchedForRef.current = null;
        }
        return;
      }

      const data = await response.json();
      if (!controller.signal.aborted) {
        setGroupings(data.groupings ?? []);
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

  return { groupings, isLoading, error, refresh };
}
